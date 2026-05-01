import { test, expect } from '@playwright/test'

/**
 * Real stack: Next.js proxy → local FastAPI + Postgres (started by CI workflow).
 * Run locally only when API + DB are up and PW_INTEGRATION=1 (see DEVELOPMENT.md).
 */
test('home loads and shows connected to real API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /what can i help with/i })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText('Connected', { exact: true })).toBeVisible({ timeout: 60_000 })
})
