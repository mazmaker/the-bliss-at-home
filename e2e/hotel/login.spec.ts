import { test, expect } from '@playwright/test'

test.describe('Hotel Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form')).toBeVisible()
  })

  test('should have email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should have submit button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should serve HTML with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bliss|Hotel|โรงแรม/i)
  })
})
