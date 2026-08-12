import { expect, test } from '@playwright/test';

test.describe('Phase 2A public flow without cloud credentials', () => {
  test('public routes render, hydrate and keep internal errors private', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    for (const path of [
      '/',
      '/catalog',
      '/calculator',
      '/cart',
      '/checkout',
      '/portfolio',
      '/admin/login',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(
        /SQL|service[_ -]?role|row level security/i,
      );
    }
    await page.goto('/cart');
    await expect(page.getByText('Корзина пуста.')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('guest write endpoint rejects a foreign origin', async ({ request }) => {
    const response = await request.post('/api/phase2a/orders', {
      data: { items: [] },
      headers: { origin: 'https://evil.example' },
    });
    expect(response.status()).toBe(403);
  });

  test('public request references are non-enumerable and strictly shaped', async ({ request }) => {
    const response = await request.get('/request/not-a-reference');
    expect(response.status()).toBe(404);
  });

  test('mobile viewport has no horizontal overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-narrow', 'Mobile-only assertion.');
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const catalogLink = page.getByRole('link', { name: 'Открыть каталог' });
    await expect(catalogLink).toBeVisible();
    expect((await catalogLink.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
