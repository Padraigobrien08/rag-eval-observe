/**
 * Generates static frames (and optionally a GIF via scripts/stitch-demo-gif.sh)
 * for the README “proof” walkthrough. Gated so normal CI does not rewrite assets.
 *
 *   pnpm demo:capture
 */
import * as fs from 'fs'
import * as path from 'path'

import { test } from '@playwright/test'

const RUN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const RUN_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const OUT_DIR = path.join(process.cwd(), 'docs', 'images', 'demo-frames')

function runSummary(id: string, hit5: number) {
  return {
    id,
    created_at: '2026-01-02T12:00:00.000Z',
    finished_at: '2026-01-02T12:01:00.000Z',
    status: 'completed',
    dataset_path: 'eval/dataset.jsonl',
    use_llm_judge: false,
    total_cases: 2,
    successful: 2,
    failed: 0,
    hit_at_1: hit5,
    hit_at_3: hit5,
    hit_at_5: hit5,
    hit_at_8: hit5,
    mrr: hit5,
    llm_judge_correctness_rate: null,
    llm_judge_faithfulness_rate: null,
    config_json: {},
  }
}

function mkCase(rowId: string, caseIndex: number, caseId: string, hit5: boolean, mrr: number) {
  return {
    id: rowId,
    case_index: caseIndex,
    case_id: caseId,
    query: `What is RAG? (${caseId})`,
    expected_sources: [] as string[],
    retrieved_sources: ['doc-rag-intro.md'],
    answer: 'Retrieval-Augmented Generation combines retrieval with generation…',
    hit_at_1: true,
    hit_at_3: true,
    hit_at_5: hit5,
    hit_at_8: true,
    mrr,
    llm_judge_correctness: null,
    llm_judge_faithfulness: null,
    llm_judge_reasoning: null,
    error: null,
    citations: [] as Record<string, unknown>[],
  }
}

async function installMocks(page: import('@playwright/test').Page) {
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

  await page.route('**/api/backend/api/v1/chat/threads**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ threads: [] }),
    })
  })

  await page.route(`**/api/backend/api/v1/eval/runs/${RUN_A}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...runSummary(RUN_A, 1),
        error_message: null,
        cases: [mkCase('c1', 0, 'case-1', true, 1), mkCase('c2', 1, 'case-2', false, 0.25)],
      }),
    })
  })

  await page.route(`**/api/backend/api/v1/eval/runs/${RUN_B}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...runSummary(RUN_B, 0.5),
        error_message: null,
        cases: [mkCase('c1b', 0, 'case-1', false, 0.2), mkCase('c2b', 1, 'case-2', true, 1)],
      }),
    })
  })

  await page.route('**/api/backend/api/v1/eval/runs?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runs: [runSummary(RUN_B, 0.5), runSummary(RUN_A, 1)],
      }),
    })
  })

  await page.route('**/api/backend/api/v1/analytics/query-logs?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        logs: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            query_text: 'How does chunk overlap help RAG quality?',
            rag_model: 'vector-similarity',
            top_k: 5,
            request_id: 'req-demo-1',
            client_ip: '127.0.0.1',
            user_agent: 'demo',
            latency_ms: 142,
            token_usage: { prompt: 120, completion: 340 },
            cost_usd: 0.002,
            citations_count: 3,
            answer_length: 890,
            created_at: '2026-01-03T10:00:00.000Z',
          },
        ],
      }),
    })
  })

  await page.route('**/api/backend/api/v1/metrics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uptime_seconds: 3600,
        routes: {
          '/api/v1/query': {
            request_count: 42,
            status_counts: { '200': 40, '429': 2 },
            latency_buckets: {},
            avg_latency_ms: 210,
            total_latency_ms: 8820,
          },
        },
        token_usage: {
          embedding_prompt_tokens: 800,
          embedding_total_tokens: 800,
          chat_prompt_tokens: 12000,
          chat_completion_tokens: 9000,
          chat_total_tokens: 21000,
        },
        note: 'In-memory counters reset on restart.',
      }),
    })
  })
}

test.describe('README demo asset capture', () => {
  test.beforeEach(({ page }, testInfo) => {
    test.skip(
      !process.env.CAPTURE_README_DEMO,
      'Set CAPTURE_README_DEMO=1 to write docs/images/demo-frames/*.png'
    )
    page.setViewportSize({ width: 1280, height: 720 })
    testInfo.annotations.push({
      type: 'readme',
      description: 'README walkthrough frames',
    })
  })

  test('write walkthrough PNGs', async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    await page.addInitScript(() => {
      window.localStorage.setItem('rag-eval-stream-responses', JSON.stringify(false))
    })
    await installMocks(page)

    await page.goto('/')
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(OUT_DIR, '01-chat.png'), fullPage: true })

    await page.goto('/query-logs')
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(OUT_DIR, '02-query-logs.png'), fullPage: true })

    await page.goto('/eval/runs')
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(OUT_DIR, '03-eval-runs.png'), fullPage: true })

    await page.goto(
      `/eval/runs?compare=${encodeURIComponent(RUN_A)}&to=${encodeURIComponent(RUN_B)}`
    )
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUT_DIR, '04-eval-compare.png'), fullPage: true })

    await page.goto(`/eval/runs?id=${encodeURIComponent(RUN_A)}`)
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUT_DIR, '05-eval-export.png'), fullPage: true })
  })
})
