import { test, expect } from '@playwright/test'

const MOCK_ANSWER = 'Mock answer for E2E.'

function sseDonePayload() {
  return JSON.stringify({
    type: 'done',
    answer: MOCK_ANSWER,
    citations: [],
    used_chunk_ids: [],
    latency_ms: 1,
    token_usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    rag_model: 'vector-similarity',
    retrieved_chunk_count: 1,
  })
}

test.describe('chat with mocked API', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/backend/api/v1/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, db: true, version: '0.1.0' }),
      })
    })

    await page.route('**/api/backend/api/v1/documents**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: [], total: 0, limit: 100, offset: 0 }),
      })
    })

    // IMPORTANT: do not use a pattern that matches `/query/stream` (e.g. `.../query` alone
    // matches both in Playwright). Wrong body type breaks streaming and the assistant never appears.
    await page.route('**/api/backend/api/v1/query**', async route => {
      const req = route.request()
      if (req.method() !== 'POST') {
        await route.continue()
        return
      }
      const path = new URL(req.url()).pathname
      if (path.endsWith('/query/stream')) {
        const chunk = `data: ${sseDonePayload()}\n\n`
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/event-stream; charset=utf-8' },
          body: chunk,
        })
        return
      }
      if (path.endsWith('/query')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            answer: MOCK_ANSWER,
            citations: [],
            used_chunk_ids: [],
            latency_ms: 1,
            token_usage: null,
            rag_model: 'vector-similarity',
            retrieved_chunk_count: 1,
          }),
        })
        return
      }
      await route.continue()
    })

    const iso = () => new Date().toISOString()
    let seqThread = 0
    let seqMsg = 0
    const threads: Array<{
      id: string
      title: string | null
      created_at: string
      updated_at: string
      message_count: number
    }> = []
    const messagesByThread: Record<
      string,
      Array<{
        id: string
        thread_id: string
        role: string
        content: string
        citations: unknown[]
        metadata: Record<string, unknown>
        latency_ms: number | null
        cost_usd: number | null
        rag_model: string | null
        seq: number
        created_at: string
      }>
    > = {}

    function syncCounts() {
      for (const t of threads) {
        t.message_count = messagesByThread[t.id]?.length ?? 0
        const last = messagesByThread[t.id]?.at(-1)
        if (last) t.updated_at = last.created_at
      }
    }

    function appendMessage(threadId: string, role: string, content: string) {
      const arr = messagesByThread[threadId] ?? []
      const seq = arr.length + 1
      const row = {
        id: `m-${++seqMsg}`,
        thread_id: threadId,
        role,
        content,
        citations: [] as unknown[],
        metadata: {} as Record<string, unknown>,
        latency_ms: null,
        cost_usd: null,
        rag_model: null,
        seq,
        created_at: iso(),
      }
      arr.push(row)
      messagesByThread[threadId] = arr
      syncCounts()
      return row
    }

    function createThread(title: string | null) {
      const id = `t-${++seqThread}`
      const now = iso()
      const row = {
        id,
        title,
        created_at: now,
        updated_at: now,
        message_count: 0,
      }
      threads.unshift(row)
      messagesByThread[id] = []
      return row
    }

    await page.route('**/api/backend/api/v1/chat/**', async route => {
      const req = route.request()
      const url = new URL(req.url())
      const pathname = url.pathname
      const method = req.method()

      const msgMatch = pathname.match(/\/chat\/threads\/([^/]+)\/messages\/?$/)
      if (msgMatch) {
        const threadId = decodeURIComponent(msgMatch[1])
        if (method === 'GET') {
          const msgs = messagesByThread[threadId] ?? []
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ messages: msgs }),
          })
          return
        }
        if (method === 'POST') {
          const body = req.postDataJSON() as { role: string; content: string }
          const row = appendMessage(threadId, body.role, body.content)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(row),
          })
          return
        }
      }

      if (pathname.endsWith('/chat/threads') || pathname.endsWith('/chat/threads/')) {
        if (method === 'GET') {
          syncCounts()
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ threads }),
          })
          return
        }
        if (method === 'POST') {
          const body = (req.postDataJSON() as { title?: string | null }) ?? {}
          const row = createThread(body.title ?? null)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...row, message_count: 0 }),
          })
          return
        }
      }

      await route.continue()
    })
  })

  test('non-streaming path shows mock answer', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('rag-eval-stream-responses', JSON.stringify(false))
    })
    await page.goto('/')
    const input = page.getByPlaceholder('Message RAG Eval...')
    await input.fill('Hello from Playwright')
    await input.press('Enter')

    await expect(page.getByText(MOCK_ANSWER, { exact: false })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('default streaming path shows mock answer (SSE)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('rag-eval-stream-responses')
    })
    await page.goto('/')
    const input = page.getByPlaceholder('Message RAG Eval...')
    await input.fill('Hello streaming')
    await input.press('Enter')

    await expect(page.getByText(MOCK_ANSWER, { exact: false })).toBeVisible({
      timeout: 15_000,
    })
  })
})
