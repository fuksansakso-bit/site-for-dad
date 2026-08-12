import { defineConfig, devices } from '@playwright/test';

const port = 3211;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  outputDir: '.local/playwright/phase2b-results',
  reporter: [['line']],
  retries: 0,
  testDir: './tests/browser',
  testMatch: 'phase2b-visualizer.spec.ts',
  timeout: 60_000,
  use: { baseURL, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm.cmd --filter @project-name/web exec next dev --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      AI_E2E_FIXTURE_ENABLED: 'true',
      AI_VISUALIZER_ENABLED: 'true',
      AI_VISUALIZER_MOCK_PROVIDER: 'true',
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'phase2b-public-test-key-never-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/api/health`,
  },
  projects: [{ name: 'chromium-phase2b', use: { ...devices['Desktop Chrome'] } }],
});
