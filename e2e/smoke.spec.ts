import { test, expect } from '@playwright/test'

test('home loads and shows chat shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /what can i help with/i })).toBeVisible()
})
