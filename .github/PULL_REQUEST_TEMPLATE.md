<!--
Thanks for contributing! Keep PRs focused — one logical change is easier to review and revert.
See CONTRIBUTING.md for the local workflow.
-->

## What & why

<!-- What does this change, and what problem does it solve? Link any issue: Closes #123 -->

## How it was verified

<!-- Check what you ran locally. -->

- [ ] Frontend: `make lint && make typecheck && make test`
- [ ] Backend: `cd backend && uv run ruff check . && uv run mypy app && uv run pytest`
- [ ] E2E (if UI changed): `pnpm exec playwright test`
- [ ] Eval gate (if retrieval/RAG changed): ran `eval/run_eval.py` and checked the delta

## Notes for reviewers

<!-- Anything non-obvious: trade-offs, follow-ups, screenshots for UI changes, or "N/A". -->
