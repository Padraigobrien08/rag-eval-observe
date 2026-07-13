# Service level objectives (examples)

These are **starter SLOs** for a self-hosted API + web UI. Adjust numbers to your user contract and monitoring stack.

## API availability

| SLI | Target | Window |
| --- | --- | --- |
| **`GET /api/v1/health` success** | 99.9% | 30 rolling days |
| **Non-stream query success** (`POST /api/v1/query` 2xx) | 99.5% | 30 rolling days |
| **Streaming query** (`/api/v1/query/stream` completes without server error) | 99.0% | 30 rolling days |

**Note:** LLM provider outages count toward **dependency** error budgets unless you define an exclusion.

## Latency (p95)

| Route | Example p95 target |
| --- | --- |
| `/api/v1/query` (non-stream, excluding LLM) | < 3 s |
| Time-to-first-token (stream) | < 2 s |

Measure these directly: `/api/v1/metrics` exposes `percentiles` (p50/p95/p99)
per route and per RAG pipeline stage, and `/api/v1/metrics/prometheus` emits
`http_request_latency_ms` / `rag_stage_latency_ms` histograms for
`histogram_quantile()` in Grafana. With `OTEL_ENABLED=true`, per-stage spans in
the trace waterfall show whether a p95 breach is retrieval or generation.

## Error budget policy

When availability falls below target for **7 consecutive days**:

1. Freeze non-critical releases.
2. Focus on reliability work (timeouts, retries, pool sizing, provider fallbacks).

## UI availability

| SLI | Target |
| --- | --- |
| Next.js origin returns **200** for `/` | 99.9% |

Pair with synthetic checks (e.g. every 1–5 minutes) from multiple regions if you serve globally.

## Eval / data pipeline

Not traditionally “SLO’d” like the API, but useful:

| SLI | Target |
| --- | --- |
| Harness run completes and persists (`eval_runs` row) when **`EVAL_PERSIST_RUNS`** is on | 95% of scheduled CI runs |

Track in CI dashboards using artifacts from **[EVAL_CI.md](./EVAL_CI.md)**.
