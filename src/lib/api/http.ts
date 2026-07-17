'use client'

/**
 * Shared plumbing for the backend API client.
 *
 * Every resource module under `src/lib/api/` builds on these: one base URL, one
 * way to turn a FastAPI error body into a message, and one browser guard. The
 * resource modules mirror the backend's own `app/api/routes/` package, so a
 * given endpoint lives in the same-named file on both sides.
 */

// Relative URL so requests proxy through the Next.js route handler
// (src/app/api/backend/[...path]/route.ts), which injects BACKEND_API_KEY
// server-side. This is why the browser never holds a backend credential —
// and it avoids mixed-content and CORS issues. See docs/HARDENING.md.
export const API_BASE_URL = '/api/backend'

/** Normalize FastAPI `detail` (string, object, or validation error list). */
export function formatApiErrorDetail(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (item && typeof item === 'object' && 'msg' in item) {
          const loc =
            'loc' in item && Array.isArray((item as { loc: unknown }).loc)
              ? `${(item as { loc: unknown[] }).loc.join('.')}: `
              : ''
          return `${loc}${String((item as { msg: unknown }).msg)}`
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message: unknown }).message)
  }
  return String(detail)
}

export function messageFromErrorResponse(text: string, status: number): string {
  const fallback = text.trim() || `Request failed with status ${status}`
  try {
    const data = JSON.parse(text) as { detail?: unknown; message?: unknown }
    if (data.detail !== undefined) return formatApiErrorDetail(data.detail) || fallback
    if (data.message !== undefined) return String(data.message)
  } catch {
    /* use fallback */
  }
  return fallback
}

/** Helper to ensure we're in browser environment. */
export function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('API functions can only be called in the browser')
  }
}

/** Abort when any of the signals abort (DOM spec `AbortSignal.any` is not universal yet). */
export function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a
  if (b.aborted) return b
  const merged = new AbortController()
  const onAbort = () => merged.abort()
  a.addEventListener('abort', onAbort)
  b.addEventListener('abort', onAbort)
  return merged.signal
}

/** Encode a value interpolated into a URL path (document id, thread id, run id). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

/** Throw the backend's error message for a non-OK response. */
export async function throwForStatus(res: Response): Promise<never> {
  const text = await res.text().catch(() => '')
  throw new Error(messageFromErrorResponse(text, res.status))
}
