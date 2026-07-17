# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Tests for the four retrieval strategies** (`tests/test_retrieval_strategies.py`, 36
  cases). `app/rag/retrieval_strategies.py` was the **least-covered module in the
  backend at 31%** — despite being the code the README benchmark table and the whole
  `rag_model` argument rest on. Now 94%, and the tests target the ranking logic rather
  than line count: RRF must rank a chunk found by _both_ retrievers above single-source
  hits; the reranker must drop hallucinated/negative indices instead of letting Python's
  negative indexing silently select the wrong chunk; a garbage LLM response must degrade
  to vector order rather than raise; multi-query dedupe must keep the _highest_ score.
  Also pins that filter values are bound as `$N` parameters and never interpolated —
  the property the module's ruff `S608` exemption claims.
- **Tests for the Redis distributed rate limiter** (`tests/test_rate_limit_redis.py`, 18
  cases), 28% → 100%. Pins the two properties docs/HARDENING.md depends on: it denies
  past the limit (including the off-by-one boundary), and a Redis outage **fails open**
  rather than taking the API down with it.
- Dependabot coverage for the backend Docker base image (`docker` ecosystem).

### Changed

- **The backend coverage gate is now 80%** (was 73%), matching the frontend gate.
  Actual coverage is 81.06%. The old 73% was an artifact of "wherever we landed"
  rather than a decision, and it was the weakest number the repo advertised.
- **The coverage badge now names its denominator: `coverage (backend + logic)`.**
  The Jest half of that number measures `src/lib` only — React components are
  covered by Playwright + axe-core instead, and Playwright coverage is not folded
  in. The scoping was always documented in `jest.config.js`, but a bare `coverage`
  label implied whole-repo and overstated what ran. The badge now understates
  tested surface rather than overstating it, which is the right direction for a
  number people read in two seconds. Scope is spelled out in
  [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#tests).
- **The README "See it in action" grid is now 2×2** and covers all four surfaces
  (chat, query logs, eval runs, metrics). `capture-live.mjs` had been generating
  `chat-empty.png` and `eval-runs.png` all along; the README only embedded two of
  the four. Every tile links to that page on the live deployment.
- **`eval-smoke` is now manual-only** (`workflow_dispatch`) instead of a weekly
  cron. The scheduled run existed only to spend OpenAI credits on a canary; on a
  self-hosted portfolio deployment that is opt-in, not a standing cost. Run it on
  demand from the Actions tab.
- Upgraded all CI actions off the deprecated Node 20 runtime to their current
  Node 24-native majors (`checkout@v7`, `upload-artifact@v7`, `download-artifact@v8`,
  `github-script@v9`), clearing the GitHub Actions deprecation warnings.
- Documented the `reranking` strategy's 200-char preview budget in code and in
  [docs/BENCHMARKS.md](docs/BENCHMARKS.md), so its benchmark row reads as a tunable
  cost/latency cap rather than a ceiling.
- Multi-query retrieval now logs raw query text at `debug`; `info`-level logs
  carry counts and lengths only.

### Removed

- **`docs/images/demo-walkthrough.gif` and its capture pipeline**
  (`e2e/readme-demo-capture.spec.ts`, `scripts/stitch-demo-gif.sh`, the
  `demo:capture` / `demo:gif` scripts). The GIF showed the **pre-template-migration
  UI** that no longer exists, over placeholder data (`case-1`, `aaaaaaaa-aaaa-…`),
  and `docs/DEVELOPMENT.md` claimed the root README embedded it — which it did not.
  The README's regression GIF and the live screenshots both show the current UI
  with real data, so the walkthrough was strictly worse than what replaced it.
  Regenerating was considered and rejected: a mocked slideshow adds nothing next to
  screenshots of the real deployment.

### Fixed

- **The chat history sidebar produced invalid list markup.** `SidebarMenu` renders a
  `<ul>`, but the date-grouping wrapped each section's `<li>` rows in `<div>`s — so
  the `<ul>` directly contained `<div>`s and the `<li>`s belonged to no list. axe
  flags this as both `list` and `listitem`; screen readers lose the item count and
  list semantics entirely. Each date section now renders its own `<ul>`, which also
  collapses five copy-pasted section blocks into one data-driven `CHAT_DATE_SECTIONS`
  map (~100 lines → ~20). Inherited from the upstream template.
- **The a11y suite was auditing a broken sidebar.** `e2e/a11y-core-pages.spec.ts`
  didn't mock `/api/history`, and the Playwright env deliberately runs without
  Postgres — so `/` rendered the sidebar's _failure_ state and axe only ever saw an
  error placeholder. That is what hid the list bug above, and it was also the source
  of the `Failed to get chats by user id` error printed by every green CI run. The
  spec now seeds history with real rows and asserts they rendered, so axe audits the
  populated list.

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
  path is Vercel + Render + Neon ([DEPLOYMENT.md](./docs/DEPLOYMENT.md)).

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
