import { defineConfig, devices } from '@playwright/test';

const webPort = 3210;
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${webPort}`;
const useExternalServer = process.env['PLAYWRIGHT_EXTERNAL_SERVER'] === 'true';

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env['CI']),
  fullyParallel: false,
  outputDir: '.local/playwright/test-results',
  reporter: [['line'], ['html', { open: 'never', outputFolder: '.local/playwright/report' }]],
  retries: 0,
  testDir: './tests/browser',
  timeout: 30_000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: `pnpm.cmd --filter @project-name/web exec next start --hostname 127.0.0.1 --port ${webPort}`,
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${baseURL}/api/health`,
        },
      }),
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'chromium-narrow',
      use: { ...devices['Desktop Chrome'], viewport: { height: 812, width: 375 } },
    },
    {
      name: 'chromium-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
});
