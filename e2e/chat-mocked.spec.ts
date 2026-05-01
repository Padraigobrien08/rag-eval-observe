import { test, expect } from '@playwright/test'

test.describe('chat with mocked API', () => {
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
          answer: 'Mock answer for E2E.',
          citations: [],
          used_chunk_ids: [],
          latency_ms: 1,
          token_usage: null,
          rag_model: 'vector-similarity',
          retrieved_chunk_count: 1,
        }),
      })
    })
  })

  test('sends message and shows assistant reply', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('Message RAG Eval...')
    await input.fill('Hello from Playwright')
    await input.press('Enter')

    await expect(page.getByText('Mock answer for E2E.', { exact: false })).toBeVisible({
      timeout: 15_000,
    })
  })
})
