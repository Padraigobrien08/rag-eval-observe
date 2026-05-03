import { test, expect } from '@playwright/test'

/** Stateful mock chat + query API so reload still sees threads/messages. */
function createPersistenceStore() {
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

  return {
    threads,
    messagesByThread,
    iso,
    appendMessage(threadId: string, role: string, content: string) {
      const arr = messagesByThread[threadId] ?? []
      const seq = arr.length + 1
      const row = {
        id: `m-${++seqMsg}`,
        thread_id: threadId,
        role,
        content,
        citations: [],
        metadata: {},
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
    },
    createThread(title: string | null) {
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
    },
    syncCounts,
  }
}

async function installPersistenceRoutes(
  page: import('@playwright/test').Page,
  store: ReturnType<typeof createPersistenceStore>
) {
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
      body: JSON.stringify({ documents: [] }),
    })
  })

  await page.route('**/api/backend/api/v1/query', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'Persisted mock reply.',
        citations: [],
        used_chunk_ids: [],
        latency_ms: 1,
        token_usage: null,
        rag_model: 'vector-similarity',
        retrieved_chunk_count: 1,
        request_id: 'e2e-req',
        query_log_id: 'e2e-query-log',
      }),
    })
  })

  await page.route('**/api/backend/api/v1/chat/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    const method = req.method()

    const msgMatch = path.match(/\/chat\/threads\/([^/]+)\/messages\/?$/)
    if (msgMatch) {
      const threadId = decodeURIComponent(msgMatch[1])
      if (method === 'GET') {
        const msgs = store.messagesByThread[threadId] ?? []
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: msgs }),
        })
        return
      }
      if (method === 'POST') {
        const body = req.postDataJSON() as { role: string; content: string }
        const row = store.appendMessage(threadId, body.role, body.content)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(row),
        })
        return
      }
    }

    if (path.endsWith('/chat/threads') || path.endsWith('/chat/threads/')) {
      if (method === 'GET') {
        store.syncCounts()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads: store.threads }),
        })
        return
      }
      if (method === 'POST') {
        const body = (req.postDataJSON() as { title?: string | null }) ?? {}
        const row = store.createThread(body.title ?? null)
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
}

test.describe('chat persistence (mocked backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('rag-eval-stream-responses', JSON.stringify(false))
    })
  })

  test('reload shows thread and history after selecting it', async ({ page }) => {
    const store = createPersistenceStore()
    await installPersistenceRoutes(page, store)

    await page.goto('/')
    await page.getByPlaceholder('Message RAG Eval...').fill('Hello persistence')
    await page.getByPlaceholder('Message RAG Eval...').press('Enter')

    await expect(page.getByText('Persisted mock reply.', { exact: false })).toBeVisible({
      timeout: 15_000,
    })

    expect(store.threads.length).toBeGreaterThanOrEqual(1)
    const tid = store.threads[0]!.id

    await page.reload()
    await installPersistenceRoutes(page, store)

    await page.getByTestId(`chat-thread-${tid}`).click()

    const chatMain = page.getByTestId('chat-layout')
    await expect(chatMain.getByText('Hello persistence', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
    await expect(chatMain.getByText('Persisted mock reply.', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
  })
})
