import { expect, test } from '@playwright/test';

test.describe('PLAN-1A-AC-002 Foundation browser smoke', () => {
  test('opens the shell and degrades dependency readiness safely', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('PHASE 1A');
    await expect(page.getByTestId('readiness')).toHaveClass(/readiness-unavailable/);

    const headers = response?.headers() ?? {};
    expect(headers['content-security-policy']).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(headers['content-security-policy']).not.toContain("'unsafe-inline'");
    expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
    expect(headers['x-correlation-id']).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
    expect(headers['x-request-id']).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  });

  test('returns safe liveness and unavailable readiness contracts', async ({ request }) => {
    const liveness = await request.get('/api/v1/health/live');
    const readiness = await request.get('/api/v1/health/ready');

    expect(liveness.status()).toBe(200);
    await expect(liveness.json()).resolves.toMatchObject({ status: 'ok' });
    expect(readiness.status()).toBe(503);
    const readinessText = await readiness.text();
    expect(JSON.parse(readinessText)).toMatchObject({
      checks: { database: 'unavailable', process: 'ok', storage: 'unavailable' },
      status: 'unavailable',
    });
    expect(readinessText).not.toMatch(/password|postgresql:\/\/|stack|127\.0\.0\.1/i);
  });

  test('renders the generic error boundary and not-found route', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('error-probe').click();
    await expect(page.locator('body')).toContainText('SAFE ERROR');
    await expect(page.locator('body')).not.toContainText('Synthetic Phase 1A error-boundary probe');

    const missing = await page.goto('/foundation-route-that-does-not-exist');
    expect(missing?.status()).toBe(404);
    await expect(page.locator('body')).toContainText('404');
  });

  test('keeps keyboard focus, narrow reflow, and reduced-motion behavior usable', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focusedControl = page.locator(':focus');
    await expect(focusedControl).toHaveCount(1);
    expect(
      await focusedControl.evaluate((element) => ['A', 'BUTTON'].includes(element.tagName)),
    ).toBe(true);
    expect(
      await focusedControl.evaluate((element) => getComputedStyle(element).outlineStyle),
    ).not.toBe('none');

    if (testInfo.project.name === 'chromium-narrow') {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    if (testInfo.project.name === 'chromium-reduced-motion') {
      expect(
        await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      ).toBe(true);
    }
  });
});
