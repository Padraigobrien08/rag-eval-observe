import { test, expect } from '@playwright/test'

/**
 * Fully automated UI demo: loads home, asserts demo copy, clicks an example pill,
 * then sends a follow-up via the keyboard — all against a mocked API (no real LLM / DB).
 *
 * Run after build (same as CI):
 *   pnpm build && pnpm exec playwright test e2e/demo-automated.spec.ts
 *
 * Or: pnpm demo:e2e
 */
test.describe('automated demo (mocked backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('rag-eval-stream-responses', JSON.stringify(false))
    })

    await page.route('**/api/backend/api/v1/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, db: true, version: '0.1.0' }),
      })
    })

    await page.route('**/api/backend/api/v1/documents**', async route => {
      const url = new URL(route.request().url())
      const includeTotal = url.searchParams.get('include_total') === 'true'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              id: 'demo-doc-1',
              source: 'introduction-to-rag',
              title: 'Introduction to RAG',
              created_at: '2026-01-01T00:00:00.000Z',
              original_available: false,
            },
          ],
          total: includeTotal ? 5 : 1,
          limit: Number(url.searchParams.get('limit')) || 100,
          offset: Number(url.searchParams.get('offset')) || 0,
        }),
      })
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
        request_id?: string | null
        query_log_id?: string | null
        eval_run_id?: string | null
        eval_case_id?: string | null
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

    await page.route('**/api/backend/api/v1/query', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer:
            '**Demo (mocked)** — This is an automated Playwright reply. In production, answers come from your RAG pipeline.',
          citations: [],
          used_chunk_ids: [],
          latency_ms: 42,
          token_usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          rag_model: 'vector-similarity',
          retrieved_chunk_count: 3,
          request_id: 'demo-req-id',
          query_log_id: 'demo-query-log-id',
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

      if (path.endsWith('/chat/threads') || path.endsWith('/chat/threads/')) {
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

  test('clicks example query then sends follow-up with keyboard', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /what can i help with/i })).toBeVisible()
    await expect(page.getByText(/5.*documents.*indexed/i)).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole('button', { name: /How does RAG combine retrieval and generation/i })
      .click()

    await expect(
      page.getByText(/Demo \(mocked\).*Playwright/i, { exact: false })
    ).toBeVisible({ timeout: 20_000 })

    const input = page.getByPlaceholder('Message RAG Eval...')
    await input.fill('Follow-up typed with the keyboard (automated demo).')
    await input.press('Enter')

    await expect(
      page.getByText('Follow-up typed with the keyboard (automated demo).', { exact: false })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Demo \(mocked\)/i).nth(1)).toBeVisible({ timeout: 20_000 })
  })
})
