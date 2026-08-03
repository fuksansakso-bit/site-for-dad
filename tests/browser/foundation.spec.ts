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

  test('keeps the catalog fail closed without an active local data plane', async ({
    page,
    request,
  }) => {
    const response = await page.goto('/catalog');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Материалы, которые управляют светом',
    );
    await expect(page.locator('body')).toContainText('Каталог сейчас недоступен');
    await expect(page.locator('body')).not.toContainText('shop.amigo.ru');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const unavailable = await request.get('/api/v1/catalog/materials');
    expect(unavailable.status()).toBe(503);
    const unavailableText = await unavailable.text();
    expect(unavailableText).not.toMatch(/objectKey|sourceHash|password|postgresql:\/\//i);

    const invalid = await request.get('/api/v1/catalog/materials?unsupported=true');
    expect(invalid.status()).toBe(400);

    const admin = await page.goto('/admin/catalog');
    expect(admin?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Редакция полного каталога',
    );
    await expect(page.locator('input[name="token"]')).toHaveAttribute('type', 'password');
    await expect(page.locator('body')).not.toContainText('798d5513');
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="token"]')).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
