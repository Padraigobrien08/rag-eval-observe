import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createCitationComponents } from '@/components/inline-citations'

// Turns `[1]` refs inside streamed markdown into clickable chips that jump to the
// matching source. The failure mode that matters is a chip pointing at a source
// that doesn't exist — so range handling is the point of these tests.
//
// `createCitationComponents` returns react-markdown component overrides; rendering
// the returned `p` / `li` directly exercises the substitution without booting
// Streamdown's markdown pipeline.

function renderParagraph(text: React.ReactNode, count: number, onClick = jest.fn()) {
  const components = createCitationComponents(onClick, count)
  const P = components?.p as (props: { children: React.ReactNode }) => React.ReactElement
  render(<P>{text}</P>)
  return onClick
}

describe('createCitationComponents', () => {
  it('returns no overrides when the answer has no sources to link to', () => {
    // Without this, every `[1]` in an uncited answer would render as a dead chip.
    expect(createCitationComponents(jest.fn(), 0)).toBeUndefined()
    expect(createCitationComponents(jest.fn(), -1)).toBeUndefined()
  })

  it('overrides both paragraphs and list items', () => {
    const components = createCitationComponents(jest.fn(), 1)
    expect(components?.p).toBeDefined()
    expect(components?.li).toBeDefined()
  })

  it('turns a ref into a labelled button and keeps the surrounding text', () => {
    renderParagraph('RAG grounds answers [1] in sources.', 1)

    const chip = screen.getByTestId('inline-citation')
    expect(chip).toHaveTextContent('1')
    expect(chip).toHaveAccessibleName('Show source 1')
    expect(screen.getByText(/RAG grounds answers/)).toBeInTheDocument()
    expect(screen.getByText(/in sources\./)).toBeInTheDocument()
  })

  it('reports the clicked source number', async () => {
    const user = userEvent.setup()
    const onClick = renderParagraph('See [2] and [1].', 2)

    const chips = screen.getAllByTestId('inline-citation')
    await user.click(chips[0])
    expect(onClick).toHaveBeenCalledWith(2)

    await user.click(chips[1])
    expect(onClick).toHaveBeenCalledWith(1)
  })

  it('links every ref in a run of text', () => {
    renderParagraph('First [1], second [2], third [3].', 3)
    expect(screen.getAllByTestId('inline-citation')).toHaveLength(3)
  })

  it('handles multi-digit refs', () => {
    renderParagraph('See [12].', 12)
    expect(screen.getByTestId('inline-citation')).toHaveTextContent('12')
  })

  describe('out-of-range refs stay literal text', () => {
    it('leaves a ref above the citation count alone', () => {
      // The model hallucinating [9] with 2 sources must not produce a chip that
      // scrolls to nothing — it stays as plain text.
      renderParagraph('Claim [9] here.', 2)
      expect(screen.queryByTestId('inline-citation')).not.toBeInTheDocument()
      expect(screen.getByText(/Claim \[9\] here\./)).toBeInTheDocument()
    })

    it('leaves [0] alone since sources are 1-indexed', () => {
      renderParagraph('Claim [0] here.', 2)
      expect(screen.queryByTestId('inline-citation')).not.toBeInTheDocument()
    })

    it('links the in-range refs and leaves the rest as text', () => {
      renderParagraph('Good [1], bad [7].', 2)

      const chips = screen.getAllByTestId('inline-citation')
      expect(chips).toHaveLength(1)
      expect(chips[0]).toHaveTextContent('1')
      expect(screen.getByText(/bad \[7\]/)).toBeInTheDocument()
    })

    it('links the boundary ref exactly at the citation count', () => {
      renderParagraph('Last [2].', 2)
      expect(screen.getByTestId('inline-citation')).toHaveTextContent('2')
    })
  })

  it('leaves bracketed text that is not a numeric ref alone', () => {
    renderParagraph('An array [a, b] and a [note].', 3)
    expect(screen.queryByTestId('inline-citation')).not.toBeInTheDocument()
  })

  it('preserves formatted children instead of dropping them', () => {
    // Non-string children (bold/code/links) can't be scanned for refs; they must
    // pass through untouched rather than be stripped.
    renderParagraph(
      [
        'Plain [1] and ',
        <strong key="b">bold text</strong>,
        ' and ',
        <code key="c">inline_code()</code>,
      ],
      1
    )

    expect(screen.getByText('bold text')).toBeInTheDocument()
    expect(screen.getByText('inline_code()')).toBeInTheDocument()
    expect(screen.getByTestId('inline-citation')).toHaveTextContent('1')
  })

  it('renders text with no refs unchanged', () => {
    renderParagraph('Nothing to cite here.', 3)
    expect(screen.getByText('Nothing to cite here.')).toBeInTheDocument()
    expect(screen.queryByTestId('inline-citation')).not.toBeInTheDocument()
  })

  it('links refs inside list items too', () => {
    const components = createCitationComponents(jest.fn(), 2)
    const Li = components?.li as (props: { children: React.ReactNode }) => React.ReactElement
    render(
      <ul>
        <Li>Bullet with [2].</Li>
      </ul>
    )
    expect(screen.getByTestId('inline-citation')).toHaveTextContent('2')
  })

  it('does not submit or navigate when clicked', () => {
    // The chip renders inside streamed markdown that may sit within a form; a
    // default-type button would submit it.
    renderParagraph('See [1].', 1)
    expect(screen.getByTestId('inline-citation')).toHaveAttribute('type', 'button')
  })
})
