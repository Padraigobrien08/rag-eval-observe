/**
 * @jest-environment node
 */
// Runs under node (not jsdom) so the Web `Response` global that ChatSDKError
// returns from toResponse() is available.
import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { ChatSDKError, getMessageByErrorCode } from '@/lib/errors'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ChatSDKError', () => {
  it('parses type and surface from the error code and maps the status', () => {
    const err = new ChatSDKError('rate_limit:chat')
    expect(err.type).toBe('rate_limit')
    expect(err.surface).toBe('chat')
    expect(err.statusCode).toBe(429)
    expect(err.message).toMatch(/maximum number of messages/i)
  })

  it('maps each error type to the right HTTP status', () => {
    expect(new ChatSDKError('bad_request:api').statusCode).toBe(400)
    expect(new ChatSDKError('unauthorized:auth').statusCode).toBe(401)
    expect(new ChatSDKError('forbidden:chat').statusCode).toBe(403)
    expect(new ChatSDKError('not_found:document').statusCode).toBe(404)
    expect(new ChatSDKError('offline:chat').statusCode).toBe(503)
  })

  it('redacts database errors in the response body but preserves the status', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}) // toResponse logs db errors
    const res = new ChatSDKError('bad_request:database', 'select * from secrets').toResponse()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('') // surface hidden
    expect(body.message).toBe('Something went wrong. Please try again later.')
    expect(JSON.stringify(body)).not.toContain('secrets')
  })

  it('exposes non-database errors with their code and cause', async () => {
    const res = new ChatSDKError('not_found:chat', 'chat 42').toResponse()
    const body = await res.json()
    expect(body.code).toBe('not_found:chat')
    expect(body.cause).toBe('chat 42')
  })
})

describe('getMessageByErrorCode', () => {
  it('returns the generic database message for any database surface', () => {
    expect(getMessageByErrorCode('bad_request:database')).toMatch(/database query/i)
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(getMessageByErrorCode('forbidden:api' as never)).toBe(
      'Something went wrong. Please try again later.'
    )
  })
})
