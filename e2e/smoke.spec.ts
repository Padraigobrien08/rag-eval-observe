import { test, expect } from '@playwright/test'
import { createChatStore, mockChatBackend, mockHistory } from './helpers'

test('home loads and shows the chat greeting', async ({ page }) => {
  await mockChatBackend(page)
  await mockHistory(page, createChatStore())
  await page.goto('/')
  await expect(page.getByText(/what can i help you find/i)).toBeVisible()
  await expect(page.getByTestId('multimodal-input')).toBeVisible()
})
