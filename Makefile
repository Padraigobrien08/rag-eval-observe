.PHONY: dev lint test typecheck format db migrate seed eval

# Development
dev:
	pnpm dev

# Linting
lint:
	pnpm lint
	pnpm format:check

# Testing
test:
	pnpm test

# Type checking
typecheck:
	pnpm typecheck

# Formatting
format:
	pnpm format

# Database operations
db:
	docker compose up -d postgres

# Database schema (same SQL as docker/init; idempotent) + Alembic revisions
migrate:
	cd backend && uv run python scripts/apply_init_sql.py && uv run alembic upgrade head

# Database seeding (eval corpus + local demo sources; idempotent)
seed:
	cd backend && uv run python scripts/seed_eval_corpus.py

# Evaluation
eval:
	cd backend && uv run python eval/run_eval.py

# API (Python FastAPI)
api:
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

api-dev:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-test:
	cd backend && uv run pytest

