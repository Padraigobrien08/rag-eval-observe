/**
 * Automated accessibility checks (axe-core) on primary routes.
 * Color-contrast is disabled here: palette review is better suited to design QA;
 * structural WCAG issues (labels, landmarks, tables) still fail the build.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createChatStore, mockHistory, type ChatStore } from './helpers'

const RUN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER_ID = '00000000-0000-4000-8000-000000000000'

/**
 * Seed /api/history with real rows. Two reasons this matters here:
 *
 * 1. The Playwright env runs without Postgres (see `PLAYWRIGHT: 'True'` in
 *    playwright.config.ts), so an unmocked /api/history 400s and the sidebar
 *    renders its *failed* state — axe would audit an error placeholder rather
 *    than the history list this suite exists to check.
 * 2. An empty list hides the interesting a11y surface anyway. Populated rows
 *    put the real nav landmarks, links, and per-row menu buttons in front of axe.
 */
function seededChatStore(): ChatStore {
  const store = createChatStore()
  store.chats.push(
    {
      id: 'aaaaaaaa-0000-4000-8000-00000000000a',
      title: 'How does RAG combine retrieval and generation?',
      createdAt: '2026-01-02T12:00:00.000Z',
      updatedAt: '2026-01-02T12:00:00.000Z',
      userId: USER_ID,
      visibility: 'private',
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-00000000000b',
      title: 'What are HNSW, hybrid search, and BM25?',
      createdAt: '2026-01-01T09:30:00.000Z',
      updatedAt: '2026-01-01T09:30:00.000Z',
      userId: USER_ID,
      visibility: 'private',
    }
  )
  return store
}

function runSummary(id: string) {
  return {
    id,
    created_at: '2026-01-02T12:00:00.000Z',
    finished_at: '2026-01-02T12:01:00.000Z',
    status: 'completed',
    dataset_path: 'eval/dataset.jsonl',
    use_llm_judge: false,
    total_cases: 1,
    successful: 1,
    failed: 0,
    hit_at_1: 1,
    hit_at_3: 1,
    hit_at_5: 1,
    hit_at_8: 1,
    mrr: 1,
    llm_judge_correctness_rate: null,
    llm_judge_faithfulness_rate: null,
    config_json: {},
  }
}

async function mockBackendBasics(page: import('@playwright/test').Page) {
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
      body: JSON.stringify({
        documents: [],
        total: 0,
        limit: 100,
        offset: 0,
      }),
    })
  })

  await page.route('**/api/backend/api/v1/chat/threads**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ threads: [] }),
    })
  })

  await page.route('**/api/backend/api/v1/eval/runs?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [runSummary(RUN_A)] }),
    })
  })

  await page.route(`**/api/backend/api/v1/eval/runs/${RUN_A}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...runSummary(RUN_A),
        error_message: null,
        cases: [
          {
            id: 'c1',
            case_index: 0,
            case_id: 'case-1',
            query: 'q',
            expected_sources: [],
            retrieved_sources: [],
            answer: 'a',
            hit_at_1: true,
            hit_at_3: true,
            hit_at_5: true,
            hit_at_8: true,
            mrr: 1,
            llm_judge_correctness: null,
            llm_judge_faithfulness: null,
            llm_judge_reasoning: null,
            error: null,
            citations: [],
          },
        ],
      }),
    })
  })

  await page.route('**/api/backend/api/v1/analytics/query-logs?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ logs: [] }),
    })
  })

  await page.route('**/api/backend/api/v1/metrics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uptime_seconds: 1,
        routes: {},
        token_usage: {
          embedding_prompt_tokens: 0,
          embedding_total_tokens: 0,
          chat_prompt_tokens: 0,
          chat_completion_tokens: 0,
          chat_total_tokens: 0,
        },
        note: 'mock',
      }),
    })
  })
}

async function assertNoAxeViolations(
  page: import('@playwright/test').Page,
  extraDisabledRules: string[] = []
) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast', ...extraDisabledRules])
    .analyze()
  expect(
    results.violations,
    results.violations
      .map(v => `${v.id}: ${v.description} — ${v.nodes.map(n => n.html).join('; ')}`)
      .join('\n')
  ).toEqual([])
}

test.describe('accessibility (axe, mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('rag-eval-stream-responses', JSON.stringify(false))
    })
    await mockBackendBasics(page)
    await mockHistory(page, seededChatStore())
  })

  test('home / chat shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/ask your documents anything/i)).toBeVisible()
    // Assert the seeded history actually rendered — otherwise a regression that
    // silently empties the sidebar would still "pass" axe on a smaller page.
    await expect(
      page.getByRole('link', { name: /How does RAG combine retrieval and generation\?/i })
    ).toBeVisible()
    // 'region': the template sidebar's group content isn't wrapped in a landmark
    // (a known template-structural limitation); other rules still enforced.
    await assertNoAxeViolations(page, ['region'])
  })

  test('eval runs list', async ({ page }) => {
    await page.goto('/eval/runs')
    await expect(page.getByRole('heading', { name: 'Eval runs' })).toBeVisible()
    await assertNoAxeViolations(page)
  })

  test('eval run detail', async ({ page }) => {
    await page.goto(`/eval/runs?id=${RUN_A}`)
    await expect(page.getByRole('heading', { name: 'Eval run' })).toBeVisible()
    await assertNoAxeViolations(page)
  })

  test('query logs', async ({ page }) => {
    await page.goto('/query-logs')
    await expect(page.getByRole('heading', { name: 'Query logs' })).toBeVisible()
    await assertNoAxeViolations(page)
  })

  test('metrics', async ({ page }) => {
    await page.goto('/metrics')
    await expect(page.getByRole('heading', { name: 'Pipeline metrics' })).toBeVisible()
    await assertNoAxeViolations(page)
  })
})
