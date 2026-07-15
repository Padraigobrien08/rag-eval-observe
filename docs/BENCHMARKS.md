# Benchmarks and case study (reproducible baseline)

LLM and retrieval outputs can vary by model version and temperature. This document defines a **repeatable procedure** and **what “good” looks like** on the **bundled demo corpus**, not a frozen leaderboard.

## Setup (golden path)

1. Postgres + migrations (`make migrate` or equivalent).
2. Seed the eval-oriented corpus: `pnpm seed:corpus` or `make seed` (same documents `eval/run_eval.py` expects to retrieve against).
3. Run the harness from `backend`:

   ```bash
   cd backend && uv run python eval/run_eval.py
   ```

4. Optional smoke: `EVAL_MAX_CASES=3` to shorten runs.

## What to record

After each run, capture from the API or UI:

- **Hit@1 / Hit@5 / MRR** (run summary).
- **Run id** (for compare and exports).
- **Git SHA** and **`OPENAI_*` model names** (embedding + chat).

Use **`GET /api/v1/eval/runs/{id}/export?format=json`** in CI to store artifacts (see **[EVAL_CI.md](./EVAL_CI.md)**).

## Worked case study: a regression the gate caught

A **real, reproduced** run of the workflow — ingesting four broad "summary /
glossary" documents silently demotes the canonical source for 12 questions, and
the CI gate (`eval/compare_eval.py`) blocks the merge. Full write-up, artifacts,
and a one-command reproduction: **[`backend/eval/case_study/`](../backend/eval/case_study/README.md)**.

| Field | Value |
| --- | --- |
| Dataset | `backend/eval/dataset.jsonl` (78 cases) |
| Embedding model | `text-embedding-3-small` |
| Chat model | `gpt-4o-mini` |
| Change under test | +4 distractor docs (`case_study/distractors/`) |
| Hit@5 | 94.9% → 97.4% (within run noise) |
| **MRR (gated)** | **0.840 → 0.812 (−0.028)** |
| Hit@1 | 76.9% → 70.5% (−6.4pp) |
| Rank-1 answers | 60 → 55 canonical sources |
| Gate result | 🔴 **fails (exit 1)** — MRR beyond ±0.02 tolerance |

The clean run reproduced the pinned baseline (`eval/baseline.json`) to within a
case, so the delta is attributable to the distractors, not drift. The takeaway:
**Hit@5 barely moved — a recall@k-only gate would have shipped this. MRR caught
it** because it is sensitive to *where* the right document lands, not just whether
it appears. This is why the gate keys on both.

## Case study template (fill in for your deployment)

| Field | Example |
| --- | --- |
| Date | |
| Commit | |
| Embedding model | |
| Chat model | |
| Dataset | `backend/eval/dataset.jsonl` |
| Hit@5 | |
| MRR | |
| Notes (reranker, top_k, etc.) | |

## Interpreting drift

- **Retrieval-only regressions** often show up as Hit@k and MRR moves with **similar** generation quality.
- **Generation regressions** may show stable Hit@k but worse human judgment; enable **`EVAL_USE_LLM_JUDGE`** when you need that signal.

For SLO-style availability targets for the API itself, see **[SLOS.md](./SLOS.md)**.
