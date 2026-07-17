/**
 * Presentation helpers for the ingest insight panel.
 *
 * The backend reports what its preprocessor did as machine keys
 * (`collapsed_blank_line_runs_to_max_2`); these turn them into something a human
 * reads. Pure functions, so they live here rather than in the dialog component.
 */

/**
 * Turn a backend preprocessing step key into a readable label.
 *
 * Keys arrive as `name` or `name:detail`, and some carry a numeric suffix
 * (`collapsed_blank_line_runs_to_max_2`) that is stripped before lookup so one
 * label covers every variant. Unknown keys degrade to the de-underscored key
 * rather than being dropped — a new backend step should still show up.
 */
export function humanizeStep(step: string): string {
  const [head, tail] = step.split(':', 2)
  const headKey = head.replace(/_to_max_\d+$/, '') // e.g. collapsed_blank_line_runs_to_max_2
  const labels: Record<string, string> = {
    removed_utf8_bom: 'Removed UTF-8 BOM',
    unicode_nfc: 'Unicode NFC',
    normalized_crlf: 'Normalized line endings',
    stripped_control_chars: 'Stripped control characters',
    stripped_trailing_line_whitespace: 'Trimmed line endings',
    collapsed_blank_line_runs: 'Collapsed blank lines',
    deduped_consecutive_paragraphs: 'Deduped paragraphs',
  }
  const base = labels[head] ?? labels[headKey] ?? head.replace(/_/g, ' ')
  return tail ? `${base} (${tail})` : base
}

/** Chunk-length stats are ints (min/max) or means — show at most 1dp, never `1234.5678`. */
export function formatLengthStat(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}
