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
   - The web app also needs (root `.env`):
     - `POSTGRES_URL` — the same Postgres the backend uses (Drizzle owns the chat/auth tables in it). Falls back to `DATABASE_URL`.
     - `AUTH_SECRET` — Auth.js signing secret. Generate with `openssl rand -base64 32` (or `npx auth secret`).
   - The chat UI now requires a session; a **guest** user is created automatically on first load, so no login is needed to try it.

3. **Schema**
   - Backend RAG tables (Docker init SQL + Alembic `upgrade head`):

     ```bash
     make migrate
     ```

   - Chat + auth tables (Drizzle, into the same DB via `POSTGRES_URL`):

     ```bash
     pnpm db:migrate
     ```

4. **Demo corpus** (recommended for first open; idempotent — skips existing `source` values)

   ```bash
   make seed
   # or: pnpm seed:corpus
   ```

   Loads the same five short RAG-topic docs used by `eval/run_eval.py`, so the home-screen example queries retrieve well.

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

7. Open [http://localhost:3000](http://localhost:3000). The UI proxies API calls to `http://localhost:8000` unless `BACKEND_API_BASE_URL` is set.

## Troubleshooting (Eval page / `Cannot find module './NNN.js'`)

If `/eval/runs` shows a huge error or **Cannot find module './463.js'**, the dev bundle is usually stale. From the repo root:

```bash
rm -rf .next && pnpm dev
```

Then hard-refresh the browser. The eval routes load their UI with **client-only** dynamic imports to reduce SSR edge cases; the API still uses `/api/backend` as usual.

## Automated UI demo (no backend)

Playwright can drive the full chat shell with **mocked** API routes (clicks an example pill + types a follow-up with the keyboard):

```bash
pnpm demo:e2e
```

This runs `pnpm build` then `playwright test e2e/demo-automated.spec.ts`. The same spec is included in the default `pnpm exec playwright test` run in CI.

## README screenshots

The "See it in action" grid embeds `docs/images/live/*.png`, captured from the
**live deployment** (real data, not mocks) by `scripts/capture-live.mjs`:

```bash
node scripts/capture-live.mjs   # → docs/images/live/{chat-empty,query-logs,eval-runs,metrics}.png
```

Re-run it after any UI change that lands in the README grid, and commit the PNGs.
Screenshots of a UI that no longer exists are worse than no screenshots, so treat
a visual redesign as a reason to re-capture.

## README regression GIF

`docs/images/eval-regression-flow.gif` shows the compare view tripping the
regression verdict. Regenerate it from deterministic Playwright captures:

```bash
pnpm demo:capture-regression   # frames via e2e/eval-regression-capture.spec.ts
pnpm demo:regression-gif       # ImageMagick → docs/images/eval-regression-flow.gif
```

## One-command stack (Docker profile `full`)

Runs Postgres, API, and Next dev server (slow first `pnpm install` in the container):

```bash
docker compose --profile full up
```

Set `OPENAI_API_KEY` in your environment before starting. The web service uses `BACKEND_API_BASE_URL=http://api:8000`.

## Tests

```bash
cd backend && uv sync --extra dev && uv run pytest tests/ -q --cov=app --cov-fail-under=80
pnpm exec jest --ci
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install   # first time only
pnpm build && pnpm exec playwright test
```

Playwright starts a production `next start` server on **http://127.0.0.1:4173** (see `playwright.config.ts`) so it does not collide with `pnpm dev` on port 3000.

### What the coverage gate covers

Two independent gates, and each one names its scope on purpose:

| Gate               | Scope                                  | Threshold |
| ------------------ | -------------------------------------- | --------- |
| `pytest --cov=app` | the whole FastAPI backend              | 80%       |
| `jest --coverage`  | `src/lib` (the TypeScript logic layer) | 80%       |

Components are tested at whichever level actually catches their bugs:

- **jsdom (Jest + Testing Library)** for components that are a pure function of
  their props — `message-observability`, `message-citations`, `inline-citations`,
  `EvalCompareResults`. Rendering these is deterministic, so it's cheap to pin the
  fiddly cases: cost formatting thresholds, `0 chunks` not being swallowed as
  falsy, out-of-range `[9]` citation refs staying literal text.
- **Playwright** for anything whose bugs live in integration — routing, streaming,
  SWR, auth — plus `axe-core` on the four core pages against a real production
  build. A jsdom snapshot can't catch those.
- **Integration E2E** (`e2e-integration.yml`) for `src/lib/db` (Drizzle) and
  `src/lib/api` (fetch wrappers), against a real Postgres and a real FastAPI.

**Component tests are deliberately not in the Jest coverage denominator.** Adding
only the tested components to `collectCoverageFrom` would cherry-pick the
denominator and inflate the badge; adding all of `src/components` would set a floor
so low it gates nothing. So the gate keeps one coherent scope — the logic layer —
and component tests earn their keep by catching bugs rather than by moving a number.

The consequence worth knowing: the README's coverage badge is labelled
**`coverage (backend + logic)`** because that is its true denominator. Neither the
component tests nor Playwright are folded into it, so the badge **understates**
total tested surface rather than overstating it.

**Broader E2E:** `e2e/eval-observability-mocked.spec.ts` covers eval list/detail/compare and query logs with a mocked API. **`e2e/a11y-core-pages.spec.ts`** runs **axe-core** on `/`, `/eval/runs`, `/query-logs`, and `/metrics` (color-contrast disabled; focus on structure and naming — see file header). Both are included in `pnpm exec playwright test` / CI.

### Integration E2E (real API + Postgres)

CI runs this in `.github/workflows/e2e-integration.yml`. Locally, with Postgres migrated and API on port 8000, and Next built with `BACKEND_API_BASE_URL=http://127.0.0.1:8000`:

```bash
pnpm build
PW_INTEGRATION=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 BACKEND_API_BASE_URL=http://127.0.0.1:8000 \
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
