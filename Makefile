.PHONY: setup db-up migrate seed train promote api compose-up compose-down test lint

VENV=.venv
PY=$(VENV)/Scripts/python

setup:
	python -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -r requirements.txt

db-up:
	docker compose up -d postgres redis mlflow

migrate:
	$(PY) -m src.data.migrate

seed:
	$(PY) -m src.data.generate_synthetic --cards 2000 --days 90 --fraud-rate 0.002

train:
	$(PY) -m src.models.train --model lightgbm --trials 60

trainxgb:
	$(PY) -m src.models.train --model xgboost --trials 60

promote:
	$(PY) -m mlops.promote

api:
	$(PY) -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

compose-up:
	docker compose up -d --build

compose-down:
	docker compose down

test:
	$(PY) -m pytest tests -v

lint:
	ruff check src tests
