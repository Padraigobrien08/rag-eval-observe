# Product thesis: eval regression as a first-class workflow

Most RAG demos stop at chat and ad-hoc retrieval. This repo is optimized for **closing the loop**: change the system → measure the same dataset → see **what regressed**, **why**, and **where to look in production traces**.

## What we optimize for

1. **Persisted harness runs** — Every `eval/run_eval.py` completion can land in Postgres (`eval_runs`, `eval_case_results`) with stable IDs you can link from chat and CI.
2. **Regression UX** — List → detail (`/eval/runs?id=…`) → **compare two runs** keyed by **`case_id`** (not fragile row order), with per-metric deltas and highlighted Hit@5 flips.
3. **Traceability** — Query audit rows (`queries`), chat `query_log_id`, and optional `eval_run_id` on messages so eval failures and live traffic share one mental model.
4. **Eval-as-code** — Export JSON/CSV and `curl` patterns in **[EVAL_CI.md](./EVAL_CI.md)** so pipelines can archive artifacts and gate merges.

## What we are not claiming

- We are not a hosted eval SaaS or a general LLM observability platform.
- Multi-tenant isolation and per-user auth are **out of scope** unless you extend the stack (see **[HARDENING.md](./HARDENING.md)**).

## How to pitch it

> “RAG chat + **persisted offline eval** + **compare runs by case id** + **query log explorer** + **export for CI** — in one repo you can deploy.”
