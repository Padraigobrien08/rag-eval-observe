# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **`eval-smoke` is now manual-only** (`workflow_dispatch`) instead of a weekly
  cron. The scheduled run existed only to spend OpenAI credits on a canary; on a
  self-hosted portfolio deployment that is opt-in, not a standing cost. Run it on
  demand from the Actions tab.
- Standardised `actions/upload-artifact` on `@v4` across every workflow (the eval
  workflows had drifted to `@v7`).
- Documented the `reranking` strategy's 200-char preview budget in code and in
  [docs/BENCHMARKS.md](docs/BENCHMARKS.md), so its benchmark row reads as a tunable
  cost/latency cap rather than a ceiling.
- Multi-query retrieval now logs raw query text at `debug`; `info`-level logs
  carry counts and lengths only.

### Added

- Dependabot coverage for the backend Docker base image (`docker` ecosystem).

## [1.0.0] - 2026-07-16

Stable 1.0. The 0.1.0 feature set proved out end to end — chat, persisted evals,
the `case_id` compare, the query log, and pipeline tracing — and this release
hardens the engineering around it: the frontend logic layer is now tested and
coverage-gated on both stacks, and the repo's community/release scaffolding is
complete. No breaking API changes from 0.1.0.

### Added

- **Frontend unit + component tests** (Jest + React Testing Library): the
  compare-by-`case_id` logic — run alignment, row classification, and the
  regression verdict — is extracted into a pure `src/lib/eval-compare.ts` module
  and tested directly, alongside cost estimation, CSV export escaping, error
  mapping, and the compare view rendering. 3 → 45 passing tests.
- **Coverage gate on the TypeScript logic layer** (`src/lib`) at a 60% floor,
  matching the backend's existing 70% pytest floor.
- **Self-hosted coverage badge** — CI computes combined frontend + backend line
  coverage and publishes a shields.io endpoint to an orphan `badges` branch, with
  no external service or account.
- `CODEOWNERS` for automatic review assignment.

### Changed

- Extracted the eval-compare logic out of the client component with no behaviour
  change, so the repo's flagship comparison is unit-testable in isolation and
  stays in lock-step with the CI gate (`compare_eval.py`).
- Marked the Azure Container Apps guide as legacy/optional; the maintained deploy
  path is Vercel + Render + Neon ([DEPLOYMENT.md](./DEPLOYMENT.md)).

## [0.1.0] - 2026-07-15

First tagged release. RAG chat over your documents, plus the parts most demos
skip: persisted offline evals, run-to-run comparison keyed by `case_id`, a
per-answer query log, and pipeline-level tracing — one repo you can deploy.

### Added

**RAG pipeline**

- Grounded chat that streams answers with inline citations to retrieved sources.
- Four retrieval strategies — vector similarity, hybrid (vector + BM25), reranking,
  and multi-query — selectable per request (`rag_model`).
- Document ingestion for text, PDF, and DOCX with adaptive, overlap-aware chunking
  and chunk-preview APIs.

**Evaluation**

- Offline eval harness (`eval/run_eval.py`) computing Hit@1/3/5/8 and MRR, with an
  optional LLM judge for correctness and faithfulness.
- Persisted runs in Postgres (`eval_runs`, `eval_case_results`) with stable IDs;
  list → drill into a run → **compare two runs by `case_id`** with per-metric deltas
  and highlighted Hit@5 flips.
- **CI eval-regression gate** (`eval/compare_eval.py`): diffs a run against a pinned
  baseline, posts a delta table as a PR comment, and fails the check when a gated
  metric (Hit@5 / MRR) regresses beyond tolerance. A guard fails loudly rather than
  passing silently when the key is missing on a same-repo run.
- Worked, reproducible case study of the gate catching a real regression
  (`backend/eval/case_study/`).
- JSON/CSV export endpoints for archiving artifacts and gating merges in CI.

**Observability**

- OpenTelemetry span per pipeline stage (`rag.retrieve` → `openai.embedding` /
  `db.vector_search` → `rag.generate` → `openai.chat`) for a full trace waterfall
  per request; degrades to a zero-cost no-op when OTel is not installed.
- Latency percentiles (p50/p95/p99) per route **and per pipeline stage**, exported
  as Prometheus histograms.
- Query-log explorer correlating live traffic and eval failures via `query_log_id`;
  structured logging with request-ID / `trace_id` correlation; per-answer cost and
  token tracking.
- One-command local trace stack (Tempo + Prometheus + Grafana) with committed
  dashboards.

**Frontend**

- Next.js 15 / React 19 app (App Router) built on Vercel's AI Chatbot template,
  adapted to stream from the FastAPI RAG backend: chat with citations and
  per-message observability, metrics dashboard, eval run list / detail / compare,
  and the query-log explorer. Auth.js (guest + email/password), Drizzle ORM.

**Engineering**

- CI: frontend lint / typecheck / Jest / build / Playwright (incl. axe-core
  accessibility) and backend Ruff / Mypy / pytest against Postgres + pgvector.
- Mypy runs across the full `app` package; backend test coverage gated at a 70%
  floor.
- Docker Compose for local and production; deploy guides for Docker, Render, and
  Azure Container Apps. Operational docs: runbook, SLOs, threat model, hardening,
  and API contract.

[Unreleased]: https://github.com/Padraigobrien08/rag-eval-observe/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Padraigobrien08/rag-eval-observe/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Padraigobrien08/rag-eval-observe/releases/tag/v0.1.0
