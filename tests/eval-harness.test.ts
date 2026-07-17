import { describe, it, expect } from '@jest/globals'
import { RERUN_EVAL_COMMAND } from '@/lib/eval-harness'

describe('RERUN_EVAL_COMMAND', () => {
  it('is the documented one-liner that runs the persisted harness', () => {
    // Kept in sync with the Makefile `eval` target and docs/EVAL_CI.md.
    expect(RERUN_EVAL_COMMAND).toBe('cd backend && uv run python eval/run_eval.py')
  })
})
