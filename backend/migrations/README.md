# Database migrations (Alembic)

The canonical schema for new environments is still defined under `docker/init/*.sql`
and applied with `scripts/apply_init_sql.py` (same as Docker’s first-time init).

Alembic is the place for **incremental** changes after that baseline:

1. Apply init SQL to an empty database (or Docker first boot).
2. Stamp the baseline revision (no-op migration):

   ```bash
   cd backend && uv run alembic stamp 001_baseline
   ```

3. For each schema change, add a revision and upgrade:

   ```bash
   uv run alembic revision -m "add column foo"
   # edit migrations/versions/…py
   uv run alembic upgrade head
   ```

Alembic uses a **sync** `postgresql+psycopg2://` URL derived from `DATABASE_URL` (async URLs are rewritten in `env.py`).
