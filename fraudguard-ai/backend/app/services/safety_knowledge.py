"""Scam-awareness knowledge base (pure data, Indian digital-payment context).

Educational content is intentionally kept SEPARATE from ML prediction logic.
"""
from __future__ import annotations

from typing import Any

SAFETY_TOPICS: list[dict[str, Any]] = [
    {
        "id": "upi-scams",
        "title": "UPI Scams",
        "description": (
            "Fraudsters trick victims into approving UPI collect requests or entering "
            "their UPI PIN to RECEIVE money. Money is actually debited, not received."
        ),
        "warning_signs": [
            "Someone asks for your UPI PIN to 'receive' money",
            "Unexpected collect requests on your UPI app",
            "Urgent claims that a payment failed and must be redone",
        ],
        "what_to_do": [
            "Never enter your UPI PIN to receive money",
            "Verify the payee name before approving any request",
            "Report to your bank and the NPCI cybercrime helpline (1930)",
        ],
        "what_not_to_do": [
            "Never share your UPI PIN, OTP, or password with anyone",
            "Do not approve collect requests from unknown people",
            "Do not click payment links sent by strangers",
        ],
        "severity": "HIGH",
    },
    {
        "id": "qr-scams",
        "title": "QR Code Scams",
        "description": (
            "Scammers send QR codes that, when scanned, DEBIT your account - scanning "
            "a QR code is not required to receive money."
        ),
        "warning_signs": [
            "A 'giveaway' or 'refund' that asks you to scan a QR code",
            "Strangers asking you to scan-and-enter-amount",
        ],
        "what_to_do": [
            "Remember: you never scan a QR code or enter a PIN to receive money",
            "Cancel the transaction if you already scanned",
            "Call 1930 (cybercrime helpline) immediately if debited",
        ],
        "what_not_to_do": [
            "Do not scan QR codes sent by unknown persons",
            "Do not enter your PIN after scanning unknown codes",
        ],
        "severity": "HIGH",
    },
    {
        "id": "fake-customer-care",
        "title": "Fake Customer Care",
        "description": (
            "Fraudsters post fake customer-care numbers online and pose as bank or "
            "wallet support to extract OTPs and credentials."
        ),
        "warning_signs": [
            "Customer care numbers from search ads or social media",
            "Agents asking for OTP/CVV/PIN 'to resolve an issue'",
        ],
        "what_to_do": [
            "Use only the official app or website to find support numbers",
            "Hang up if asked for OTP or PIN",
        ],
        "what_not_to_do": [
            "Never share OTPs even with 'bank officials'",
            "Do not install screen-sharing apps suggested by unknown agents",
        ],
        "severity": "HIGH",
    },
    {
        "id": "phishing",
        "title": "Phishing Links & Messages",
        "description": (
            "Fake websites and SMS/email links imitate banks and payment apps to "
            "steal login credentials and card details."
        ),
        "warning_signs": [
            "Misspelled domains (e.g. paytm-bank.xyz)",
            "Messages creating urgency: 'account will be blocked'",
        ],
        "what_to_do": [
            "Type the official URL yourself or use the official app",
            "Report and delete phishing messages",
        ],
        "what_not_to_do": [
            "Do not click links from unknown senders",
            "Never enter card details on pages reached via links",
        ],
        "severity": "MEDIUM",
    },
    {
        "id": "fake-job-scams",
        "title": "Fake Job / Task Scams",
        "description": (
            "'Earn from home' schemes ask for registration fees or assign 'prepaid "
            "tasks' that escalate into large deposits to unknown accounts."
        ),
        "warning_signs": [
            "Jobs requiring upfront payment or fees",
            "Telegram/WhatsApp groups promising quick commissions",
        ],
        "what_to_do": ["Verify the employer independently", "Report the number and block it"],
        "what_not_to_do": [
            "Never pay to get a job",
            "Do not deposit money to 'unlock earnings'",
        ],
        "severity": "MEDIUM",
    },
    {
        "id": "investment-scams",
        "title": "Investment & Trading Scams",
        "description": (
            "Fake trading platforms and 'guaranteed return' schemes show fake profits "
            "then block withdrawals."
        ),
        "warning_signs": [
            "Guaranteed high returns with no risk",
            "Unregistered apps with referral-only onboarding",
        ],
        "what_to_do": [
            "Verify SEBI registration before investing",
            "Withdraw profits early to test the platform",
        ],
        "what_not_to_do": [
            "Do not trust 'guaranteed' returns",
            "Do not transfer money to personal accounts for investing",
        ],
        "severity": "HIGH",
    },
    {
        "id": "digital-arrest-scams",
        "title": "Digital Arrest Scams",
        "description": (
            "Callers posing as police/customs claim you are under 'digital arrest' and "
            "demand money to avoid arrest. Police never demand money this way."
        ),
        "warning_signs": [
            "Video calls from 'police officers' in uniform",
            "Threats of arrest unless you pay immediately",
        ],
        "what_to_do": [
            "Hang up and call 1930 or your local police directly",
            "Remember: there is no concept of 'digital arrest' in Indian law",
        ],
        "what_not_to_do": ["Do not pay anything", "Do not stay on the call under pressure"],
        "severity": "CRITICAL",
    },
    {
        "id": "remote-access-scams",
        "title": "Remote Access / Screen Sharing Scams",
        "description": (
            "Fraudsters convince victims to install screen-sharing apps (AnyDesk, "
            "TeamViewer) and then read OTPs and drain accounts."
        ),
        "warning_signs": [
            "Support agents asking you to install apps",
            "Anyone requesting your screen to 'help' with a payment",
        ],
        "what_to_do": ["Uninstall such apps immediately", "Change your UPI/banking PINs"],
        "what_not_to_do": [
            "Never share your screen with unknown persons",
            "Do not allow notification access to strangers",
        ],
        "severity": "CRITICAL",
    },
    {
        "id": "fake-shopping",
        "title": "Fake Shopping Websites & Deals",
        "description": (
            "Cloned e-commerce sites and '80% off' social media ads take payments and "
            "never deliver goods."
        ),
        "warning_signs": [
            "Prices too good to be true",
            "No HTTPS / freshly registered domains",
        ],
        "what_to_do": ["Buy only from well-known sites/apps", "Check reviews and domain age"],
        "what_not_to_do": [
            "Do not pay via UPI to personal accounts for online orders",
            "Do not share card details on unverified sites",
        ],
        "severity": "MEDIUM",
    },
    {
        "id": "social-media-scams",
        "title": "Social Media Impersonation & Giveaway Scams",
        "description": (
            "Fake profiles impersonate friends/celebrities and run fake giveaways "
            "requesting payments or 'verification fees'."
        ),
        "warning_signs": [
            "Won a contest you never entered",
            "Profiles with recently created accounts asking for money",
        ],
        "what_to_do": ["Verify via a known contact channel", "Report the account"],
        "what_not_to_do": [
            "Do not pay 'processing fees' for prizes",
            "Do not share personal documents",
        ],
        "severity": "MEDIUM",
    },
    {
        "id": "fake-payment-screenshots",
        "title": "Fake Payment Screenshots",
        "description": (
            "Sellers/buyers show edited payment screenshots claiming money was sent. "
            "Always verify actual credit in your bank statement."
        ),
        "warning_signs": [
            "Screenshot instead of in-app confirmation",
            "Pressure to ship goods before money arrives",
        ],
        "what_to_do": ["Check your actual bank/UPI balance", "Wait for real credit"],
        "what_not_to_do": [
            "Do not release goods based on screenshots",
            "Do not refund 'extra payment' you never received",
        ],
        "severity": "MEDIUM",
    },
    {
        "id": "upi-collect-request-scams",
        "title": "UPI Collect Request Scams",
        "description": (
            "Fraudsters send collect requests masked as cashback/refunds; approving "
            "and entering your PIN actually PAYS them."
        ),
        "warning_signs": [
            "Collect requests promising cashback",
            "Unknown handles requesting money with urgent messages",
        ],
        "what_to_do": ["Decline unknown collect requests", "Verify in your UPI app history"],
        "what_not_to_do": [
            "Do not enter your PIN to approve requests from strangers",
            "Do not trust 'cashback' promises",
        ],
        "severity": "HIGH",
    },
]
