# Eval artifacts in CI

Persisted eval runs are available over the HTTP API (same auth as other `/api/v1/*` routes when `API_KEY` is configured).

## Fetch run JSON (detail)

```bash
BASE=http://localhost:8000/api/v1
RUN_ID=00000000-0000-0000-0000-000000000000
curl -sS -H "X-API-Key: $API_KEY" "$BASE/eval/runs/$RUN_ID" | jq '.hit_at_5, .mrr'
```

## Download export attachments

The export route returns `Content-Disposition: attachment` for archival or pipeline artifacts.

```bash
curl -sS -H "X-API-Key: $API_KEY" \
  "$BASE/eval/runs/$RUN_ID/export?format=json" -o "eval-$RUN_ID.json"

curl -sS -H "X-API-Key: $API_KEY" \
  "$BASE/eval/runs/$RUN_ID/export?format=csv" -o "eval-$RUN_ID.csv"
```

## Run harness locally or in CI

From the repo root (see `Makefile`):

```bash
cd backend && uv run python eval/run_eval.py
```

Set `EVAL_PERSIST_RUNS=1` (default) so the run appears in the API and UI. For a minimal smoke run, use `EVAL_MAX_CASES=1`.
