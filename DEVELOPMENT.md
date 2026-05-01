# Local development

## Prerequisites

- Node 20+, [pnpm](https://pnpm.io/) 9+
- Python 3.11+, [uv](https://docs.astral.sh/uv/)
- Docker (optional, for Postgres + API in containers)

## Golden path (native)

1. **Postgres with pgvector**
   - Either: `docker compose up -d postgres` from the repo root (see `docker-compose.yml`),
   - Or use a hosted URL in `DATABASE_URL`.

2. **Environment**
   - Put `DATABASE_URL` and `OPENAI_API_KEY` in the repo root `.env` and/or `backend/.env` (backend loads both; see `ENV_VARS.md`).

3. **Schema** (Docker init SQL + Alembic `upgrade head`)

   ```bash
   make migrate
   ```

4. **Optional sample corpus** (idempotent; skips existing sources)

   ```bash
   make seed
   ```

5. **Backend**

   ```bash
   make api-dev
   # or: cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Frontend** (new terminal)

   ```bash
   pnpm install
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000). The UI proxies API calls to `http://localhost:8000` unless `AZURE_API_BASE_URL` is set.

## One-command stack (Docker profile `full`)

Runs Postgres, API, and Next dev server (slow first `pnpm install` in the container):

```bash
docker compose --profile full up
```

Set `OPENAI_API_KEY` in your environment before starting. The web service uses `AZURE_API_BASE_URL=http://api:8000`.

## Tests

```bash
cd backend && uv sync --extra dev && uv run pytest tests/ -q --cov=app --cov-fail-under=58
pnpm exec jest --ci
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install   # first time only
pnpm build && pnpm exec playwright test
```

Playwright starts a production `next start` server on **http://127.0.0.1:4173** (see `playwright.config.ts`) so it does not collide with `pnpm dev` on port 3000.

### Integration E2E (real API + Postgres)

CI runs this in `.github/workflows/e2e-integration.yml`. Locally, with Postgres migrated and API on port 8000, and Next built with `AZURE_API_BASE_URL=http://127.0.0.1:8000`:

```bash
pnpm build
PW_INTEGRATION=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 AZURE_API_BASE_URL=http://127.0.0.1:8000 \
  pnpm exec next start -H 127.0.0.1 -p 4173 &
pnpm exec playwright test
```

Stop the stray `next start` when finished.

## Migrations (Alembic)

`make migrate` applies `docker/init/*.sql` then `alembic upgrade head`. For databases created before Alembic was added, see `backend/migrations/README.md` (one-time `stamp`).

## Observability

- In-app JSON metrics: `GET /api/v1/metrics`
- Prometheus text: `GET /api/v1/metrics/prometheus`
- Grafana: `observability/grafana/README.md` and `observability/grafana-rag-eval-prometheus.json`.

Structured logs in non-TTY environments are JSON; search by field `request_id` on `http_request` events.
