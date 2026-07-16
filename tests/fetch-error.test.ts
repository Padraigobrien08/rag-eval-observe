import { describe, it, expect } from '@jest/globals'
import { shortFetchError } from '@/lib/fetch-error'

describe('shortFetchError', () => {
  it('falls back to a generic message for empty input', () => {
    expect(shortFetchError('')).toBe('Request failed.')
    expect(shortFetchError('   ')).toBe('Request failed.')
  })

  it('translates an HTML error page into a build-hint message', () => {
    expect(shortFetchError('<!DOCTYPE html><html><body>500</body></html>')).toMatch(
      /HTML error page/i
    )
  })

  it('translates a missing-chunk error into a cache-reset hint', () => {
    expect(shortFetchError('Error: Cannot find module ./chunk.js')).toMatch(/out of sync/i)
  })

  it('passes short plain messages through unchanged', () => {
    expect(shortFetchError('Run not found')).toBe('Run not found')
  })

  it('truncates over-long messages with an ellipsis', () => {
    const long = 'x'.repeat(500)
    const out = shortFetchError(long, 420)
    expect(out).toHaveLength(421) // 420 chars + ellipsis
    expect(out.endsWith('…')).toBe(true)
  })
})
