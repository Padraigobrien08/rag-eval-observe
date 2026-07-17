import { afterEach, describe, it, expect, jest } from '@jest/globals'
import {
  convertToUIMessages,
  cosineSimilarity,
  fetcher,
  generateUUID,
  getTextFromMessage,
  sanitizeText,
} from '@/lib/utils'

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

  describe('convertToUIMessages', () => {
    it('maps persisted rows into AI SDK UI messages with an ISO createdAt', () => {
      const rows = [
        {
          id: 'db-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'hi' }],
          createdAt: new Date('2026-01-02T03:04:05Z'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ]
      const [msg] = convertToUIMessages(rows)
      expect(msg.id).toBe('db-1')
      expect(msg.role).toBe('assistant')
      expect(msg.parts).toEqual([{ type: 'text', text: 'hi' }])
      // formatISO renders in the runner's local offset; assert the instant, not the string.
      const createdAt = msg.metadata?.createdAt as string
      expect(new Date(createdAt).getTime()).toBe(new Date('2026-01-02T03:04:05Z').getTime())
    })
  })

  describe('fetcher', () => {
    const originalFetch = globalThis.fetch
    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    const stubFetch = (body: string, status: number) => {
      // jsdom defines neither fetch nor Response, so hand-roll the shape
      // fetcher consumes: ok / status / json(). A non-JSON body makes json()
      // reject, exercising the `.catch(() => undefined)` path.
      const res = {
        ok: status >= 200 && status < 300,
        status,
        json: async () => JSON.parse(body),
      }
      globalThis.fetch = jest.fn(async () => res as unknown as Response) as typeof fetch
    }

    it('returns the parsed JSON body on a 2xx response', async () => {
      stubFetch(JSON.stringify({ ok: true }), 200)
      await expect(fetcher('/api/x')).resolves.toEqual({ ok: true })
    })

    it('throws an error carrying the status and parsed error body on failure', async () => {
      stubFetch(JSON.stringify({ detail: 'nope' }), 503)
      await expect(fetcher('/api/x')).rejects.toMatchObject({
        status: 503,
        info: { detail: 'nope' },
      })
    })

    it('tolerates a non-JSON error body (info left undefined)', async () => {
      stubFetch('boom', 500)
      await expect(fetcher('/api/x')).rejects.toMatchObject({ status: 500 })
    })
  })
})
