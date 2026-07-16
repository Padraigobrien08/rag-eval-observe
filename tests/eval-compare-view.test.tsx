import { describe, it, expect } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvalCompareResults } from '@/app/(scrollable)/eval/runs/EvalCompareClient'
import { makeCase, makeRun } from './fixtures/eval'

// EvalCompareResults is data-free (takes two loaded runs as props), so it renders
// without the router/data-fetching wrapper. These tests exercise the flagship
// surface: the verdict banner and the per-case retrieval diff.

describe('EvalCompareResults', () => {
  it('renders a Regression verdict when the candidate loses a gated metric', () => {
    const baseline = makeRun('A', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.84 })
    const candidate = makeRun('B', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.79 })
    render(<EvalCompareResults a={baseline} b={candidate} />)
    expect(screen.getByText('Regression')).toBeInTheDocument()
  })

  it('shows a flipped case and reveals its rank shift on expand', async () => {
    const user = userEvent.setup()
    const baseline = makeRun('A', [
      makeCase({
        case_id: 'q1',
        query: 'where did the canonical source go',
        expected_sources: ['canonical.md'],
        retrieved_sources: ['canonical.md', 'a.md'],
        hit_at_5: true,
        mrr: 1,
      }),
    ])
    const candidate = makeRun('B', [
      makeCase({
        case_id: 'q1',
        query: 'where did the canonical source go',
        expected_sources: ['canonical.md'],
        retrieved_sources: ['a.md', 'b.md'], // canonical.md fell out of retrieval
        hit_at_5: false,
        mrr: 0,
      }),
    ])
    render(<EvalCompareResults a={baseline} b={candidate} />)

    // The changed-case row is listed with its Hit@5-lost badge.
    const row = screen.getByRole('button', { name: /where did the canonical source go/i })
    expect(within(row).getByText('Hit@5 lost')).toBeInTheDocument()

    // Expanding reveals the retrieval diff: #1 -> miss for the canonical source.
    await user.click(row)
    expect(screen.getByText(/#1 → miss/)).toBeInTheDocument()
  })

  it('refuses to compare runs from different datasets', () => {
    const a = makeRun('A', [makeCase({ case_id: 'q1' })], { dataset_path: 'eval/a.jsonl' })
    const b = makeRun('B', [makeCase({ case_id: 'q1' })], { dataset_path: 'eval/b.jsonl' })
    render(<EvalCompareResults a={a} b={b} />)
    expect(screen.getByText('Not comparable')).toBeInTheDocument()
    expect(screen.queryByText('Regression')).not.toBeInTheDocument()
  })
})
