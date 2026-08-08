import { expect, test, type Page } from '@playwright/test';

test.describe('QG-267 Phase 1C configurator browser acceptance', () => {
  test.skip(process.env['PHASE1C_BROWSER'] !== 'true', 'Runs against the real local Phase 1C catalog.');

  async function chooseRoller(page: Page, width = '400', height = '500', quantity = '2') {
    await page.goto('/configure');
    await page.getByRole('button', { name: /Рулонные шторы Точный автоматический/ }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: 'Рулонные ткани' }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: 'ROLLA Кассета' }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: 'MINI MINI' }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: /Стандартный монтаж/ }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    const dimensions = page.getByRole('spinbutton');
    await dimensions.nth(0).fill(width);
    await dimensions.nth(1).fill(height);
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: /ЛИНА BLACK-OUT/ }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: /Белая фурнитура/ }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('button', { name: 'Справа' }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await page.getByRole('spinbutton').fill(quantity);
  }

  test('calculates quantity server-side, shows free services and saves immutable quote', async ({ page }, testInfo) => {
    await chooseRoller(page);
    await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
    await expect(page.getByText('CALCULATED', { exact: true })).toBeVisible();
    await expect(page.getByText('3 048,00 ₽', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Изделия × 2')).toBeVisible();
    for (const service of ['Замер', 'Доставка', 'Установка']) {
      await expect(page.getByText(service, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Сохранить расчёт' }).click();
    const link = page.getByRole('link', { name: 'Открыть ссылку →' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/quote\/[A-Za-z0-9_-]{32}$/u);
    await expect(page.getByRole('heading', { name: 'Предварительная стоимость' })).toBeVisible();
    if (testInfo.project.name === 'chromium-narrow') {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });

  test('shows PRICE_ON_REQUEST without a fake amount for unsupported family', async ({ page }) => {
    await page.goto('/configure');
    await page.getByRole('button', { name: /ZIP системы для террас Цена по запросу/ }).click();
    await page.getByRole('button', { name: 'Продолжить →' }).click();
    await expect(page.getByText('PRICE_ON_REQUEST', { exact: true })).toBeVisible();
    await expect(page.getByText('Сумма не подставляется')).toBeVisible();
    await expect(page.getByText('0,00 ₽')).toHaveCount(0);
  });

  test('shows server manual-review state for an unverified exact dimension', async ({ page }) => {
    await chooseRoller(page, '401', '501', '1');
    await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
    await expect(page.getByText('MANUAL_REVIEW_REQUIRED', { exact: true })).toBeVisible();
    await expect(page.getByText('Размер требует проверки мастером.')).toBeVisible();
  });

  test('renders the per-unit 1500 RUB minimum state', async ({ page }) => {
    await chooseRoller(page);
    await page.route('**/api/v1/pricing/calculate', async (route) => {
      const now = new Date().toISOString();
      await route.fulfill({ contentType: 'application/json', status: 200, body: JSON.stringify({
        calculationId: '00000000-0000-4000-8000-000000000001', calculationToken: 'm'.repeat(32),
        correlationId: 'browser-minimum-test', result: { appliedOverrides: [], appliedRules: [],
          calculatedAt: now, currency: 'RUB', deliveryKopecks: 0, grandTotalKopecks: 300000,
          installationKopecks: 0, measurementKopecks: 0, minimumPriceApplied: true,
          minimumPriceKopecks: 150000, optionsTotalKopecks: 0,
          priceVersionId: '00000000-0000-4000-8000-000000000002', productsSubtotalKopecks: 300000,
          quantity: 2, safeExplanation: 'Минимальная цена применена отдельно к каждому изделию.',
          sourceVersion: 'browser-fixture', status: 'CALCULATED', unitBasePriceKopecks: 100000,
          unitFinalPriceKopecks: 150000, unitPriceBeforeMinimumKopecks: 100000,
          validationDetails: [], warnings: [] } }) });
    });
    await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
    await expect(page.getByText('Минимум за изделие')).toBeVisible();
    await expect(page.getByText('1 500,00 ₽', { exact: true })).toBeVisible();
    await expect(page.getByText('3 000,00 ₽', { exact: true }).first()).toBeVisible();
  });
});
