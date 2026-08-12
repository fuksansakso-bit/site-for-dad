import { defineConfig, devices } from '@playwright/test';

const localPort = 3212;
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${localPort}`;
const useExternalServer = process.env['PLAYWRIGHT_EXTERNAL_SERVER'] === 'true';

export default defineConfig({
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env['CI']),
  fullyParallel: false,
  outputDir: '.local/playwright/phase2c-results',
  reporter: [['line']],
  retries: 0,
  testDir: './tests/browser',
  testMatch: 'phase2c-final.spec.ts',
  timeout: 180_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: `node apps/web/node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port ${localPort}`,
          env: { ...process.env, NEXT_PUBLIC_SITE_URL: baseURL },
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${baseURL}/api/health`,
        },
      }),
  projects: [{ name: 'chromium-phase2c', use: { ...devices['Desktop Chrome'] } }],
});
