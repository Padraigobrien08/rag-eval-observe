import { describe, it, expect, jest, beforeAll } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageCitations } from '@/components/message-citations'
import type { Citation } from '@/lib/types'

// The sources panel under an answer. This is the "answers cite their retrieved
// sources" claim — if it renders the wrong source or the wrong score, the whole
// grounding story is wrong.

beforeAll(() => {
  // jsdom has no layout, so scrollIntoView is undefined on elements.
  Element.prototype.scrollIntoView = jest.fn()
})

function citation(overrides: Partial<Citation> = {}): Citation {
  return {
    chunk_id: 'chunk-1',
    document_id: 'doc-1',
    title: 'Introduction to RAG',
    source: 'introduction-to-rag.md',
    chunk_index: 0,
    ...overrides,
  }
}

describe('MessageCitations', () => {
  it('renders nothing when an answer has no citations', () => {
    // An ungrounded answer must not show an empty "0 sources" affordance.
    const { container } = render(<MessageCitations citations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    [1, '1 source'],
    [2, '2 sources'],
  ])('pluralises %i as %p', (count, expected) => {
    const citations = Array.from({ length: count }, (_, i) =>
      citation({ chunk_id: `chunk-${i}`, chunk_index: i })
    )
    render(<MessageCitations citations={citations} />)
    expect(screen.getByRole('button', { name: new RegExp(expected) })).toBeInTheDocument()
  })

  it('keeps the source list collapsed until asked', async () => {
    const user = userEvent.setup()
    render(<MessageCitations citations={[citation()]} />)

    expect(screen.queryByText('Introduction to RAG')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /1 source/ }))
    expect(screen.getByText('Introduction to RAG')).toBeInTheDocument()
  })

  it('numbers sources from 1 to match the [n] refs in the answer text', async () => {
    const user = userEvent.setup()
    render(
      <MessageCitations
        citations={[
          citation({ chunk_id: 'a', title: 'First' }),
          citation({ chunk_id: 'b', title: 'Second' }),
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: /2 sources/ }))

    const items = screen.getAllByRole('listitem')
    // Off-by-one here would point every inline [n] at the wrong source.
    expect(within(items[0]).getByText('1')).toBeInTheDocument()
    expect(within(items[1]).getByText('2')).toBeInTheDocument()
  })

  it('falls back from title to source, then to Untitled', async () => {
    const user = userEvent.setup()
    render(
      <MessageCitations
        citations={[
          citation({ chunk_id: 'a', title: null, source: 'orphan.md' }),
          citation({ chunk_id: 'b', title: null, source: '' }),
        ]}
      />
    )
    await user.click(screen.getByRole('button', { name: /2 sources/ }))

    expect(screen.getByText('orphan.md')).toBeInTheDocument()
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('does not repeat the source line when it duplicates the title', async () => {
    const user = userEvent.setup()
    render(<MessageCitations citations={[citation({ title: 'same.md', source: 'same.md' })]} />)
    await user.click(screen.getByRole('button', { name: /1 source/ }))

    expect(screen.getAllByText('same.md')).toHaveLength(1)
  })

  it('shows the grounding snippet and chunk index', async () => {
    const user = userEvent.setup()
    render(
      <MessageCitations
        citations={[citation({ chunk_index: 7, content_snippet: 'RAG combines retrieval...' })]}
      />
    )
    await user.click(screen.getByRole('button', { name: /1 source/ }))

    expect(screen.getByText('RAG combines retrieval...')).toBeInTheDocument()
    expect(screen.getByText('chunk #7')).toBeInTheDocument()
  })

  describe('score meter', () => {
    it('shows the retrieval score to 2dp with the exact value on hover', async () => {
      const user = userEvent.setup()
      render(<MessageCitations citations={[citation({ score: 0.8421 })]} />)
      await user.click(screen.getByRole('button', { name: /1 source/ }))

      expect(screen.getByText('0.84')).toBeInTheDocument()
      expect(screen.getByTitle('Retrieval score 0.842')).toBeInTheDocument()
    })

    it.each([
      // The bar is a percentage width, so a score outside 0..1 would otherwise
      // render a bar that overflows or inverts its container.
      [1.4, '100%'],
      [-0.3, '0%'],
      [0.5, '50%'],
    ])('clamps a score of %p to a %p bar', async (score, width) => {
      const user = userEvent.setup()
      const { container } = render(<MessageCitations citations={[citation({ score })]} />)
      await user.click(screen.getByRole('button', { name: /1 source/ }))

      const bar = container.querySelector('span[style]') as HTMLElement
      expect(bar).toHaveStyle({ width })
    })

    it('omits the meter when the backend reported no score', async () => {
      const user = userEvent.setup()
      render(<MessageCitations citations={[citation({ score: undefined })]} />)
      await user.click(screen.getByRole('button', { name: /1 source/ }))

      expect(screen.queryByTitle(/Retrieval score/)).not.toBeInTheDocument()
    })
  })

  describe('controlled open state', () => {
    it('honours the open prop so an inline [n] click can expand the panel', () => {
      render(<MessageCitations citations={[citation()]} open={true} />)
      expect(screen.getByText('Introduction to RAG')).toBeInTheDocument()
    })

    it('reports toggles to the parent without self-managing state', async () => {
      const user = userEvent.setup()
      const onOpenChange = jest.fn()
      render(<MessageCitations citations={[citation()]} open={false} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: /1 source/ }))

      expect(onOpenChange).toHaveBeenCalledWith(true)
      // Still closed: the parent owns the state and hasn't re-rendered it open.
      expect(screen.queryByText('Introduction to RAG')).not.toBeInTheDocument()
    })
  })

  it('emphasises the highlighted source and scrolls it into view', () => {
    render(
      <MessageCitations
        citations={[
          citation({ chunk_id: 'a', title: 'First' }),
          citation({ chunk_id: 'b', title: 'Second' }),
        ]}
        highlightIndex={1}
        open={true}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items[1].className).toContain('ring-ring')
    expect(items[0].className).not.toContain('ring-ring')
    expect(items[1].scrollIntoView).toHaveBeenCalled()
  })
})
