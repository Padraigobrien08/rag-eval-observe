import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MessageObservability } from '@/components/message-observability'

// The per-message footer under every answer: latency, cost, tokens, chunk count,
// retriever, and the link into the query log. This is where the README's "per-message
// latency, cost, tokens, and a link straight to the query-log trace" claim is cashed.

describe('MessageObservability', () => {
  it('renders the full metric line in order', () => {
    render(
      <MessageObservability
        data={{
          latencyMs: 5460,
          costUsd: 0.0005,
          tokenUsage: { total_tokens: 812 },
          retrievedCount: 8,
          ragModel: 'vector-similarity',
        }}
      />
    )

    const row = screen.getByTestId('message-observability')
    expect(row).toHaveTextContent('5.46s')
    expect(row).toHaveTextContent('$0.0005')
    expect(row).toHaveTextContent('812 tok')
    expect(row).toHaveTextContent('8 chunks')
    expect(row).toHaveTextContent('vector-similarity')
  })

  it('renders nothing when there is no observability to show', () => {
    // An empty strip of separators under an answer would be worse than nothing.
    const { container } = render(<MessageObservability data={{}} />)
    expect(container).toBeEmptyDOMElement()
  })

  describe('cost formatting', () => {
    it.each([
      // Sub-cent costs are the normal case for one RAG answer, so they need 4dp —
      // $0.00 would render every cheap answer as free.
      [0.0005, '$0.0005'],
      [0.0001, '$0.0001'],
      // At/above a cent, 2dp is the readable form.
      [0.42, '$0.42'],
      [1.5, '$1.50'],
      // Exactly zero is a real value (cache hit / no billed call), not "unknown".
      [0, '$0'],
    ])('formats %p as %p', (costUsd, expected) => {
      render(<MessageObservability data={{ costUsd }} />)
      expect(screen.getByTestId('message-observability')).toHaveTextContent(expected)
    })

    it('omits cost entirely when it is unknown', () => {
      render(<MessageObservability data={{ latencyMs: 1000 }} />)
      expect(screen.getByTestId('message-observability')).not.toHaveTextContent('$')
    })
  })

  describe('token totals', () => {
    it('prefers the reported total', () => {
      render(
        <MessageObservability
          data={{ tokenUsage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 99 } }}
        />
      )
      expect(screen.getByTestId('message-observability')).toHaveTextContent('99 tok')
    })

    it('falls back to prompt + completion when no total is reported', () => {
      render(
        <MessageObservability data={{ tokenUsage: { prompt_tokens: 10, completion_tokens: 5 } }} />
      )
      expect(screen.getByTestId('message-observability')).toHaveTextContent('15 tok')
    })

    it('hides the token count when the usage adds up to zero', () => {
      render(<MessageObservability data={{ latencyMs: 1000, tokenUsage: { total_tokens: 0 } }} />)
      expect(screen.getByTestId('message-observability')).not.toHaveTextContent('tok')
    })
  })

  it('shows zero chunks rather than hiding it', () => {
    // "0 chunks" is the signal that an answer was ungrounded — the single most
    // important thing this strip can say. It must never be swallowed as falsy.
    render(<MessageObservability data={{ retrievedCount: 0 }} />)
    expect(screen.getByTestId('message-observability')).toHaveTextContent('0 chunks')
  })

  it('links to the query log row for this exact answer', () => {
    render(<MessageObservability data={{ latencyMs: 1000, queryLogId: 'qlog-123' }} />)

    const link = screen.getByRole('link', { name: 'query log' })
    expect(link).toHaveAttribute('href', '/query-logs?id=qlog-123')
    // The id is exposed on hover too — it's the join key between a chat answer
    // and its trace, so it needs to be copyable.
    expect(screen.getByTestId('message-observability')).toHaveAttribute(
      'title',
      'query_log_id: qlog-123'
    )
  })

  it('omits the query-log link when the answer has no trace', () => {
    render(<MessageObservability data={{ latencyMs: 1000 }} />)
    expect(screen.queryByRole('link', { name: 'query log' })).not.toBeInTheDocument()
  })
})
