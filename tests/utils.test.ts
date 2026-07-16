import { describe, it, expect } from '@jest/globals'
import { cosineSimilarity, generateUUID, getTextFromMessage, sanitizeText } from '@/lib/utils'

describe('Utils', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between two vectors', () => {
      const a = [1, 0, 0]
      const b = [1, 0, 0]
      const similarity = cosineSimilarity(a, b)
      expect(similarity).toBe(1)
    })

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0]
      const b = [0, 1, 0]
      const similarity = cosineSimilarity(a, b)
      expect(similarity).toBe(0)
    })

    it('returns 0 when either vector is all zeros (no divide-by-zero)', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    })

    it('should throw error for vectors of different lengths', () => {
      const a = [1, 2]
      const b = [1, 2, 3]
      expect(() => cosineSimilarity(a, b)).toThrow()
    })
  })

  describe('generateUUID', () => {
    it('matches the RFC4122 v4 shape', () => {
      expect(generateUUID()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    })

    it('produces distinct values across calls', () => {
      expect(generateUUID()).not.toBe(generateUUID())
    })
  })

  describe('sanitizeText', () => {
    it('strips the has_function_call marker', () => {
      expect(sanitizeText('hello<has_function_call>')).toBe('hello')
    })
  })

  describe('getTextFromMessage', () => {
    it('concatenates only the text parts, in order', () => {
      const message = {
        id: 'm1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Hello ' },
          { type: 'reasoning', text: 'ignored' },
          { type: 'text', text: 'world' },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
      expect(getTextFromMessage(message)).toBe('Hello world')
    })
  })
})
