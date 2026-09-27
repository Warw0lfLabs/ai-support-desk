import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from './scripts/test-env';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run db:migrate && npm run start -- --port 3101',
    url: 'http://localhost:3101/api/health',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      AI_PROVIDER: 'mock',
      DEMO_CUSTOMER_REPLIES: 'true',
      APP_ORIGIN: 'http://localhost:3101',
      LOG_LEVEL: 'silent',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
