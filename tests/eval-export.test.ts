import { describe, it, expect } from '@jest/globals'
import { evalRunDetailToCsv } from '@/lib/eval-export'
import { makeCase, makeRun } from './fixtures/eval'

describe('evalRunDetailToCsv', () => {
  it('emits a summary header row, a blank separator, and a per-case section', () => {
    const run = makeRun('run-1', [makeCase({ case_id: 'q1', case_index: 0 })])
    const lines = evalRunDetailToCsv(run).split('\n')
    expect(lines[0].split(',')).toContain('run_id')
    expect(lines[1]).toContain('run-1')
    expect(lines[2]).toBe('') // blank separator between summary and per-case
    expect(lines[3].split(',')).toEqual([
      'case_index',
      'case_id',
      'query',
      'hit_at_1',
      'hit_at_3',
      'hit_at_5',
      'hit_at_8',
      'mrr',
      'error',
    ])
  })

  it('quotes and escapes cells containing commas, quotes, or newlines', () => {
    const run = makeRun('run-1', [
      makeCase({ case_id: 'q1', query: 'what is "RAG", exactly?\nline two' }),
    ])
    const csv = evalRunDetailToCsv(run)
    // Embedded quotes are doubled and the whole cell is wrapped in quotes.
    expect(csv).toContain('"what is ""RAG"", exactly?\nline two"')
  })

  it('renders a null case error as an empty field', () => {
    const run = makeRun('run-1', [makeCase({ case_id: 'q1', error: null })])
    const caseLine = evalRunDetailToCsv(run).split('\n').at(-1)!
    expect(caseLine.endsWith(',')).toBe(true) // trailing empty error cell
  })
})
