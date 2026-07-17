/**
 * Ingest flow with a mocked backend: dialog -> submit -> insight panel.
 *
 * The insight panel is the only place the app explains what the pipeline did to
 * a document (normalization steps, chunk counts, shard spread), and it renders
 * entirely from the ingest response — so a mocked payload exercises it honestly.
 */
import { test, expect } from '@playwright/test'
import { createChatStore, mockChatBackend, mockHistory } from './helpers'

const INGEST_RESPONSE = {
  document_id: 'doc-abc-123',
  chunks_created: 12,
  replaced_existing: false,
  preprocessing: {
    original_character_count: 5000,
    normalized_character_count: 4880,
    character_delta: -120,
    steps_applied: ['removed_utf8_bom', 'collapsed_blank_line_runs_to_max_2:4'],
    warnings: [],
  },
  chunking: {
    chunks_before_merge: 14,
    chunks_created: 12,
    undersized_chunk_merges: 2,
    chunk_target_size: 800,
    chunk_overlap: 100,
    adaptive_chunking: true,
    config_chunk_size: 800,
    config_chunk_overlap: 100,
    estimated_target_chunks: 13,
    min_chunk_characters_applied: 200,
    merged_chunk_soft_cap_chars: 1200,
    chunk_length_min: 210,
    chunk_length_max: 1180,
    chunk_length_mean: 1234.5678,
    chunk_length_median: 820,
  },
}

test.beforeEach(async ({ page }) => {
  await mockChatBackend(page)
  await mockHistory(page, createChatStore())
  await page.route('**/api/backend/api/v1/ingest', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(INGEST_RESPONSE),
    })
  })
})

async function openIngestDialog(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByTestId('sidebar-toggle-button').click()
  await page.getByRole('button', { name: 'Ingest document' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('ingest dialog submits text and reports what the pipeline did', async ({ page }) => {
  await openIngestDialog(page)
  await expect(page.getByText(/Drag and drop a file here/)).toBeVisible()

  await page.getByRole('button', { name: 'Enter text manually' }).click()
  await page.getByPlaceholder('Enter document text...').fill('Some document text about RAG.')
  await page.getByPlaceholder('Source (e.g. URL, system name)').fill('verify.md')
  await page.getByRole('button', { name: 'Ingest', exact: true }).click()

  // The document id has to survive to the panel — it's what you'd copy to go
  // look the document up afterwards.
  await expect(page.getByText('doc-abc-123')).toBeVisible()
  await expect(page.getByText('Indexed successfully')).toBeVisible()

  // Preprocessing steps arrive as machine keys; the panel must render them as
  // prose, including the `_to_max_N` variant and its `:detail` suffix.
  await expect(page.getByText('Removed UTF-8 BOM')).toBeVisible()
  await expect(page.getByText('Collapsed blank lines (4)')).toBeVisible()

  // A raw mean of 1234.5678 must render as 1,234.6, not the full float.
  await expect(page.getByText('1,234.6').first()).toBeVisible()
})

test('ingest is blocked until both source and text are provided', async ({ page }) => {
  await openIngestDialog(page)
  const submit = page.getByRole('button', { name: 'Ingest', exact: true })

  // Source alone isn't enough — submitting here would 422 from the backend.
  await page.getByPlaceholder('Source (e.g. URL, system name)').fill('verify.md')
  await expect(submit).toBeDisabled()

  await page.getByRole('button', { name: 'Enter text manually' }).click()
  await page.getByPlaceholder('Enter document text...').fill('Some text.')
  await expect(submit).toBeEnabled()
})
