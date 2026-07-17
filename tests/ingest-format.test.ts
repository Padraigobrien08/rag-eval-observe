import { describe, it, expect } from '@jest/globals'
import { formatLengthStat, humanizeStep } from '@/lib/ingest-format'

// The ingest panel's job is to tell you what the backend actually did to your
// document. These turn its machine keys into that story, so a silently dropped
// or mangled step is a real (if quiet) loss of information.

describe('humanizeStep', () => {
  it.each([
    ['removed_utf8_bom', 'Removed UTF-8 BOM'],
    ['unicode_nfc', 'Unicode NFC'],
    ['normalized_crlf', 'Normalized line endings'],
    ['stripped_control_chars', 'Stripped control characters'],
    ['stripped_trailing_line_whitespace', 'Trimmed line endings'],
    ['collapsed_blank_line_runs', 'Collapsed blank lines'],
    ['deduped_consecutive_paragraphs', 'Deduped paragraphs'],
  ])('labels the known step %p', (step, expected) => {
    expect(humanizeStep(step)).toBe(expected)
  })

  it('strips the _to_max_N suffix so one label covers every variant', () => {
    // The backend emits collapsed_blank_line_runs_to_max_2 / _to_max_3 / ...
    // Without the suffix strip, each variant would miss the lookup and render raw.
    expect(humanizeStep('collapsed_blank_line_runs_to_max_2')).toBe('Collapsed blank lines')
    expect(humanizeStep('collapsed_blank_line_runs_to_max_10')).toBe('Collapsed blank lines')
  })

  it('appends the detail after a colon', () => {
    expect(humanizeStep('unicode_nfc:12 chars')).toBe('Unicode NFC (12 chars)')
  })

  it('combines a suffixed key with its detail', () => {
    expect(humanizeStep('collapsed_blank_line_runs_to_max_2:4')).toBe('Collapsed blank lines (4)')
  })

  it('degrades an unknown step to a readable key rather than dropping it', () => {
    // A step the frontend hasn't learned yet should still appear — showing
    // "some new step" beats showing nothing at all.
    expect(humanizeStep('some_new_step')).toBe('some new step')
    expect(humanizeStep('some_new_step:9')).toBe('some new step (9)')
  })

  it('splits on only the first colon, keeping the rest as detail', () => {
    expect(humanizeStep('unicode_nfc:ratio 1:2')).toBe('Unicode NFC (ratio 1)')
  })

  it('handles an empty step without throwing', () => {
    expect(humanizeStep('')).toBe('')
  })
})

describe('formatLengthStat', () => {
  it('renders integers with thousands separators', () => {
    expect(formatLengthStat(1234)).toBe('1,234')
    expect(formatLengthStat(0)).toBe('0')
  })

  it('caps fractional stats at 1dp', () => {
    // Chunk-length means arrive as long floats; 1,234.6 is the useful precision.
    expect(formatLengthStat(1234.5678)).toBe('1,234.6')
  })

  it('keeps a single decimal place as-is', () => {
    expect(formatLengthStat(842.5)).toBe('842.5')
  })
})
