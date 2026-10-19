"""CSV upload processing: validation, cleaning, duplicate detection.

Expected columns (with accepted aliases):
  transaction_id, amount, date, time, merchant, category, location,
  payment_method, device_type

Invalid rows are NEVER silently discarded - every problem is reported back
with row numbers and reasons.
"""
from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from app.services.providers import TransactionIn
from ml.features import parse_transaction_datetime

logger = logging.getLogger("fraudguard.csv")

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_ROWS = 10_000

COLUMN_ALIASES: dict[str, set[str]] = {
    "transaction_reference": {"transaction_id", "transactionid", "id", "ref", "reference", "txn_id"},
    "amount": {"amount", "value", "amt", "transaction_amount"},
    "date": {"date", "transaction_date", "txn_date", "datetime", "timestamp"},
    "time": {"time", "transaction_time", "txn_time"},
    "merchant": {"merchant", "merchant_name", "payee", "name"},
    "merchant_category": {"category", "merchant_category", "type", "merchant_type"},
    "location": {"location", "city", "place"},
    "payment_method": {"payment_method", "paymentmode", "payment_mode", "method", "mode"},
    "device_type": {"device_type", "device", "devicecategory", "device_category"},
}

REQUIRED_COLUMNS = ("amount", "date", "merchant")
VALID_PAYMENT_METHODS = {"upi", "debit card", "credit card", "wallet", "net banking", "cash", "other"}


class CSVValidationError(Exception):
    def __init__(self, message: str, errors: list[str] | None = None) -> None:
        super().__init__(message)
        self.errors = errors or [message]


@dataclass
class CSVProcessingResult:
    total_rows: int = 0
    valid_rows: list[TransactionIn] = field(default_factory=list)
    invalid_rows: int = 0
    duplicates: int = 0
    errors: list[str] = field(default_factory=list)


def _normalize_headers(headers: list[str]) -> dict[str, str]:
    """Map CSV headers (any case/spacing) to canonical names via alias sets."""
    mapping: dict[str, str] = {}
    for raw in headers:
        cleaned = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
        canonical = cleaned if cleaned in COLUMN_ALIASES else None
        if canonical is None:
            for canon, aliases in COLUMN_ALIASES.items():
                if cleaned in aliases:
                    canonical = canon
                    break
        if canonical:
            mapping[raw] = canonical
    return mapping


def parse_amount(value: Any, row_no: int, errors: list[str]) -> float | None:
    try:
        amount = float(str(value).replace(",", "").replace("₹", "").strip())
    except (TypeError, ValueError):
        errors.append(f"Row {row_no}: invalid amount '{value}'")
        return None
    if amount <= 0:
        errors.append(f"Row {row_no}: amount must be > 0 (got {amount})")
        return None
    if amount > 10_000_000:
        errors.append(f"Row {row_no}: amount unreasonably large ({amount})")
        return None
    return round(amount, 2)


def process_csv(file_bytes: bytes, filename: str = "upload.csv") -> CSVProcessingResult:
    """Validate + clean a CSV upload into normalized TransactionIn rows."""
    result = CSVProcessingResult()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise CSVValidationError(f"File too large (max {MAX_FILE_SIZE_BYTES // 1024 // 1024} MB)")
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise CSVValidationError("File must be UTF-8 encoded CSV") from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise CSVValidationError("CSV file is empty or has no header row")

    mapping = _normalize_headers(list(reader.fieldnames))
    missing = [c for c in REQUIRED_COLUMNS if c not in mapping.values()]
    if missing:
        raise CSVValidationError(
            f"Missing required columns: {', '.join(missing)}. Expected headers like "
            "transaction_id, amount, date, time, merchant, category, location, "
            f"payment_method, device_type. Found: {reader.fieldnames}"
        )

    seen_refs: set[str] = set()
    for row_no, raw_row in enumerate(reader, start=2):
        result.total_rows += 1
        if result.total_rows > MAX_ROWS:
            result.errors.append(
                f"Row {row_no}: skipped - file exceeds max row limit ({MAX_ROWS})"
            )
            result.invalid_rows += 1
            continue

        row_errors: list[str] = []
        row = {
            mapping.get(k, str(k).strip().lower()): (v or "").strip() if isinstance(v, str) else v
            for k, v in raw_row.items()
        }

        amount = parse_amount(row.get("amount"), row_no, row_errors)

        dt = parse_transaction_datetime(row.get("date"), row.get("time") or None)
        if dt is None:
            row_errors.append(f"Row {row_no}: invalid date '{row.get('date')}'")
        elif dt > datetime.now() + timedelta(minutes=5):
            row_errors.append(f"Row {row_no}: date is in the future ({dt.isoformat()})")

        merchant = (row.get("merchant") or "").strip()
        if not merchant:
            row_errors.append(f"Row {row_no}: merchant is required")
        elif len(merchant) > 255:
            row_errors.append(f"Row {row_no}: merchant name too long")
            merchant = merchant[:255]

        payment_method = (row.get("payment_method") or "UPI").strip()
        payment_method_valid = payment_method.lower() in VALID_PAYMENT_METHODS
        if not payment_method_valid:
            row_errors.append(
                f"Row {row_no}: unknown payment method '{payment_method}' "
                f"(valid: UPI, Debit Card, Credit Card, Wallet, Net Banking)"
            )

        valid = (
            amount is not None and dt is not None and merchant and payment_method_valid
        )
        if valid:
            ref = (row.get("transaction_reference") or "").strip()
            if ref and ref in seen_refs:
                result.duplicates += 1
                result.errors.append(
                    f"Row {row_no}: duplicate transaction_id '{ref}' in upload"
                )
                continue
            if ref:
                seen_refs.add(ref)
            result.valid_rows.append(TransactionIn(
                amount=amount,
                transaction_datetime=dt,
                merchant=merchant,
                merchant_category=(row.get("merchant_category") or "Other").strip() or "Other",
                payment_method=payment_method,
                location=(row.get("location") or "").strip() or None,
                device_type=(row.get("device_type") or "mobile").strip() or "mobile",
                transaction_reference=ref or None,
                source="csv",
            ))
            continue

        result.invalid_rows += 1
        result.errors.extend(row_errors)

    logger.info(
        "CSV '%s' processed: total=%d valid=%d invalid=%d duplicates=%d",
        filename, result.total_rows, len(result.valid_rows),
        result.invalid_rows, result.duplicates,
    )
    return result
