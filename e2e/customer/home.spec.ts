import { test, expect } from '@playwright/test'

test.describe('Customer Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bliss|บลิส|massage|นวด/i)
  })

  test('should display page content', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).toBeAttached()
  })

  test('should use mobile viewport (iPhone 14)', async ({ page }) => {
    await page.goto('/')
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThanOrEqual(430)
  })
})
