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
