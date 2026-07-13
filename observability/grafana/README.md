# Grafana

Dashboard JSON for Prometheus-backed metrics lives next to this folder:
[`grafana-rag-eval-prometheus.json`](../grafana-rag-eval-prometheus.json).

Panels use datasource UID `prometheus` (or the `${datasource}` variable when importing).

## Import in the UI

1. Grafana → **Dashboards** → **New** → **Import**.
2. Upload `observability/grafana-rag-eval-prometheus.json`.
3. Choose your Prometheus datasource when prompted.

## Provisioning (Docker / Kubernetes)

Use the files under `provisioning/`:

| Mount (container path) | Source file |
|------------------------|-------------|
| `/etc/grafana/provisioning/datasources/datasource.yaml` | `provisioning/datasources/datasource.yaml` |
| `/etc/grafana/provisioning/dashboards/default.yaml` | `provisioning/dashboards/default.yaml` |
| `/etc/grafana/dashboards/rag-eval.json` | `../grafana-rag-eval-prometheus.json` |

Edit `datasource.yaml` so `url` points at your Prometheus. The dashboard provider reads JSON from `/etc/grafana/dashboards`.

## Metrics reference

Scraped from `GET /api/v1/metrics/prometheus`:

| Metric | Type | Labels | Use |
|--------|------|--------|-----|
| `http_requests_total` | counter | `route`, `status` | Request/error rate |
| `http_request_latency_ms` | histogram | `route` | `histogram_quantile(0.95, sum by (le,route) (rate(http_request_latency_ms_bucket[5m])))` |
| `rag_stage_latency_ms` | histogram | `stage` | Per-stage p95 (`retrieve`, `embedding`, `chat_completion`, …) — shows whether latency is retrieval or generation |
| `openai_tokens_*` | counter | — | Token spend |

For a full per-request trace waterfall (server → `rag.retrieve` → `openai.embedding` / `db.vector_search` → `rag.generate` → `openai.chat`), run the backend with `OTEL_ENABLED=true` (`uv sync --extra otel`) and point `OTEL_EXPORTER_OTLP_ENDPOINT` at Tempo/Jaeger. Logs carry the matching `trace_id`.
