import { test, expect } from '@playwright/test'

test.describe('Admin App - Smoke Tests', () => {
  test('should serve HTML with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bliss Admin/i)
  })

  test('should have root div element', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#root')).toBeAttached()
  })

  test('should load Vite client scripts', async ({ page }) => {
    await page.goto('/')
    // Vite dev server injects its client script
    const scripts = page.locator('script[type="module"]')
    await expect(scripts.first()).toBeAttached()
  })

  test('/login route returns 200', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBe(200)
  })
})
