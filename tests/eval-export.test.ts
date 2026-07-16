import { afterEach, describe, it, expect, jest } from '@jest/globals'
import { downloadEvalRunCsv, downloadEvalRunJson, evalRunDetailToCsv } from '@/lib/eval-export'
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

describe('download helpers', () => {
  const originalCreate = (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL
  const originalRevoke = (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL

  afterEach(() => {
    jest.restoreAllMocks()
    // jsdom doesn't define these, so assignment (not spyOn) is how we stub them.
    ;(URL as { createObjectURL?: unknown }).createObjectURL = originalCreate
    ;(URL as { revokeObjectURL?: unknown }).revokeObjectURL = originalRevoke
  })

  function spyDownload() {
    const createURL = jest.fn(() => 'blob:mock')
    const revokeURL = jest.fn()
    ;(URL as { createObjectURL: unknown }).createObjectURL = createURL
    ;(URL as { revokeObjectURL: unknown }).revokeObjectURL = revokeURL
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    return { createURL, revokeURL, click }
  }

  it('downloadEvalRunJson names the file per run and revokes the object URL', () => {
    const { createURL, revokeURL, click } = spyDownload()
    const anchors: HTMLAnchorElement[] = []
    const orig = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = orig(tag) as HTMLElement
      if (tag === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })

    downloadEvalRunJson(makeRun('run-42', [makeCase({ case_id: 'q1' })]))

    expect(createURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeURL).toHaveBeenCalledWith('blob:mock')
    expect(anchors[0].download).toBe('eval-run-run-42.json')
  })

  it('downloadEvalRunCsv names the file with a .csv extension', () => {
    spyDownload()
    const anchors: HTMLAnchorElement[] = []
    const orig = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = orig(tag) as HTMLElement
      if (tag === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })

    downloadEvalRunCsv(makeRun('run-7', [makeCase({ case_id: 'q1' })]))

    expect(anchors[0].download).toBe('eval-run-run-7.csv')
  })
})
