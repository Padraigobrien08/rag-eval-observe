import { parseCitations, splitTextWithCitations } from '../citationParser'

describe('parseCitations', () => {
  it('should parse single citations', () => {
    const text = 'This is text [1] and more [2].'
    const result = parseCitations(text)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      text: '[1]',
      startIndex: 13,
      endIndex: 16,
      citationNumbers: [1],
    })
    expect(result[1]).toEqual({
      text: '[2]',
      startIndex: 26,
      endIndex: 29,
      citationNumbers: [2],
    })
  })

  it('should parse multiple citations together', () => {
    const text = 'This is text [1][3] and more.'
    const result = parseCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '[1][3]',
      startIndex: 13,
      endIndex: 19,
      citationNumbers: [1, 3],
    })
  })

  it('should parse triple citations', () => {
    const text = 'Text [1][2][3] here.'
    const result = parseCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '[1][2][3]',
      startIndex: 5,
      endIndex: 14,
      citationNumbers: [1, 2, 3],
    })
  })

  it('should handle no citations', () => {
    const text = 'This is plain text with no citations.'
    const result = parseCitations(text)

    expect(result).toHaveLength(0)
  })

  it('should handle citations at start', () => {
    const text = '[1] This starts with a citation.'
    const result = parseCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '[1]',
      startIndex: 0,
      endIndex: 3,
      citationNumbers: [1],
    })
  })

  it('should handle citations at end', () => {
    const text = 'This ends with a citation [1]'
    const result = parseCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '[1]',
      startIndex: 26,
      endIndex: 29,
      citationNumbers: [1],
    })
  })

  it('should handle multiple separate citations', () => {
    const text = 'First [1] then [2] and finally [3].'
    const result = parseCitations(text)

    expect(result).toHaveLength(3)
    expect(result[0].citationNumbers).toEqual([1])
    expect(result[1].citationNumbers).toEqual([2])
    expect(result[2].citationNumbers).toEqual([3])
  })

  it('should handle large citation numbers', () => {
    const text = 'Citation [10] and [25].'
    const result = parseCitations(text)

    expect(result).toHaveLength(2)
    expect(result[0].citationNumbers).toEqual([10])
    expect(result[1].citationNumbers).toEqual([25])
  })

  it('should ignore invalid patterns', () => {
    const text = 'Not a citation [abc] or [ 1 ] or [1 2].'
    const result = parseCitations(text)

    expect(result).toHaveLength(0)
  })

  it('should handle citations in markdown', () => {
    const text = 'This is **bold** text [1] with *italic* [2].'
    const result = parseCitations(text)

    expect(result).toHaveLength(2)
    expect(result[0].citationNumbers).toEqual([1])
    expect(result[1].citationNumbers).toEqual([2])
  })
})

describe('splitTextWithCitations', () => {
  it('should split text with citations', () => {
    const text = 'This is text [1] and more [2].'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(5)
    expect(result[0]).toBe('This is text ')
    expect(result[1]).toMatchObject({ citationNumbers: [1] })
    expect(result[2]).toBe(' and more ')
    expect(result[3]).toMatchObject({ citationNumbers: [2] })
    expect(result[4]).toBe('.')
  })

  it('should handle text with no citations', () => {
    const text = 'This is plain text.'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(text)
  })

  it('should handle citations at start', () => {
    const text = '[1] This starts with citation.'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ citationNumbers: [1] })
    expect(result[1]).toBe(' This starts with citation.')
  })

  it('should handle citations at end', () => {
    const text = 'This ends with citation [1]'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('This ends with citation ')
    expect(result[1]).toMatchObject({ citationNumbers: [1] })
  })

  it('should handle multiple citations together', () => {
    const text = 'Text [1][2] here.'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('Text ')
    expect(result[1]).toMatchObject({ citationNumbers: [1, 2] })
    expect(result[2]).toBe(' here.')
  })

  it('should treat adjacent citations as one marker block', () => {
    const text = '[1][2]'
    const result = splitTextWithCitations(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ citationNumbers: [1, 2] })
  })
})
