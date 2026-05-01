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

3. **Schema**

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
cd backend && uv sync --extra dev && uv run pytest tests/ -q
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install   # first time only
pnpm build && pnpm exec playwright test
```

## Migrations (Alembic)

Baseline schema is still SQL under `docker/init`. After `make migrate`, stamp Alembic once:

```bash
cd backend && uv run alembic stamp 001_baseline
```

See `backend/migrations/README.md` for incremental revisions.

## Observability

- In-app JSON metrics: `GET /api/v1/metrics`
- Prometheus text: `GET /api/v1/metrics/prometheus`
- Import `observability/grafana-rag-eval-prometheus.json` into Grafana (set your Prometheus datasource).

Structured logs in non-TTY environments are JSON; search by field `request_id` on `http_request` events.
