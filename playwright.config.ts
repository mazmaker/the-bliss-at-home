import { defineConfig, devices } from '@playwright/test'

// Use E2E-specific ports to avoid conflicts with dev servers
const ADMIN_PORT = process.env.E2E_ADMIN_PORT || '5001'
const CUSTOMER_PORT = process.env.E2E_CUSTOMER_PORT || '5002'
const HOTEL_PORT = process.env.E2E_HOTEL_PORT || '5003'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30_000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin',
      testDir: './e2e/admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${ADMIN_PORT}`,
      },
    },
    {
      name: 'customer',
      testDir: './e2e/customer',
      use: {
        ...devices['iPhone 14'],
        baseURL: `http://localhost:${CUSTOMER_PORT}`,
      },
    },
    {
      name: 'hotel',
      testDir: './e2e/hotel',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${HOTEL_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${ADMIN_PORT}`,
      url: `http://localhost:${ADMIN_PORT}`,
      cwd: './apps/admin',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${CUSTOMER_PORT}`,
      url: `http://localhost:${CUSTOMER_PORT}`,
      cwd: './apps/customer',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${HOTEL_PORT}`,
      url: `http://localhost:${HOTEL_PORT}`,
      cwd: './apps/hotel',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
