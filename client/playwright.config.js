import { defineConfig, devices } from '@playwright/test';

/**
 * The E2E suite boots the real API and the real Vite server and drives a real
 * browser. No mocks anywhere — that is the point of the layer. It is slow, so
 * there is exactly one spec covering the flow that matters most.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm --prefix ../server run start',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_PATH: './data/e2e.db',
        ACCESS_TOKEN_SECRET: 'e2e-access-secret-not-for-production-use-0123456789',
        REFRESH_TOKEN_SECRET: 'e2e-refresh-secret-not-for-production-use-9876543210',
        CORS_ORIGIN: 'http://localhost:5173',
        NODE_ENV: 'test',
      },
    },
    { command: 'npm run dev', port: 5173, reuseExistingServer: !process.env.CI },
  ],
});
