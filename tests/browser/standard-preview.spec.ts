import type {
  ConfiguratorBootstrapResponse,
  PricingCalculationResponse,
} from '../../packages/contracts/src/index.js';
import type { StandardPreviewStateResponse } from '../../packages/contracts/src/preview.js';
import { expect, test, type Page } from '@playwright/test';

const enabled = process.env['PHASE1D_BROWSER'] === 'true';
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:3210';
const supportedFamilies = ['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM', 'VERTICAL'] as const;

function idempotency(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function json<T>(response: { json(): Promise<unknown>; ok(): boolean }): Promise<T> {
  expect(response.ok()).toBe(true);
  return (await response.json()) as T;
}

async function createPreview(
  page: Page,
  familyCode: (typeof supportedFamilies)[number],
  expectLoadedRenderer = true,
) {
  const bootstrap = await json<ConfiguratorBootstrapResponse>(
    await page.request.get('/api/v1/configurator'),
  );
  const family = bootstrap.families.find((item) => item.code === familyCode);
  const profile = bootstrap.profiles.find((item) => item.productFamilyId === family?.id);
  if (family === undefined || profile === undefined)
    throw new Error(`PROFILE_REQUIRED:${familyCode}`);
  const headers = {
    'Idempotency-Key': idempotency('browser-preview'),
    Origin: new URL(baseURL).origin,
    'X-CSRF-Token': bootstrap.csrfToken,
  };
  const calculation = await json<PricingCalculationResponse>(
    await page.request.post('/api/v1/pricing/calculate', {
      data: {
        additionalOptionIds: [],
        catalogVersionId: bootstrap.catalogVersionId,
        configuratorModelId: profile.configuratorModelId,
        controlTypeId: profile.optionData.controlTypes[0]?.id,
        hardwareOptionId: profile.optionData.hardwareOptions[0]?.id,
        heightMm: profile.minimumHeightMm,
        materialVariantId: profile.materialVariantId,
        mountingTypeId: profile.optionData.mountingTypes[0]?.id,
        productFamilyId: profile.productFamilyId,
        productSystemId: profile.productSystemId,
        quantity: 1,
        widthMm: profile.minimumWidthMm,
      },
      headers,
    }),
  );
  const created = await json<{ readonly href: string; readonly previewStateId: string }>(
    await page.request.post('/api/v1/previews', {
      data: { calculationToken: calculation.calculationToken },
      headers: { ...headers, 'Idempotency-Key': idempotency('browser-preview-state') },
    }),
  );
  await page.goto(created.href);
  if (expectLoadedRenderer) {
    await expect(page.locator(`[data-family-renderer="${familyCode}"]`)).toBeVisible();
    await expect(page.locator('[data-preview-layer="supplier-interior"]')).toBeVisible();
    await expect(page.locator('[data-preview-layer="material-source"]')).toHaveCount(1);
  }
  await page.waitForLoadState('networkidle');
  return created;
}

async function chooseRollerInConfigurator(page: Page) {
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
  await dimensions.nth(0).fill('400');
  await dimensions.nth(1).fill('500');
  await page.getByRole('button', { name: 'Продолжить →' }).click();
  await page.getByRole('button', { name: /ЛИНА BLACK-OUT/ }).click();
  await page.getByRole('button', { name: 'Продолжить →' }).click();
  await page.getByRole('button', { name: /Белая фурнитура/ }).click();
  await page.getByRole('button', { name: 'Продолжить →' }).click();
  await page.getByRole('button', { name: 'Справа' }).click();
  await page.getByRole('button', { name: 'Продолжить →' }).click();
  await page.getByRole('spinbutton').fill('1');
  await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
  await expect(page.getByText('CALCULATED', { exact: true })).toBeVisible();
}

test.describe('QG-296..QG-304 Phase 1D browser acceptance', () => {
  test.skip(!enabled, 'Runs against the real local Phase 1D catalog and object storage.');

  test('opens from configurator, changes state and returns with selection preserved', async ({
    page,
  }) => {
    await chooseRollerInConfigurator(page);
    await page.getByRole('button', { name: 'Посмотреть на окне' }).click();
    await expect(page).toHaveURL(/\/preview\?state=[A-Za-z0-9_-]{32}$/u);
    await expect(page.locator('[data-family-renderer="ROLLER"]')).toBeVisible();
    const checksum = await page
      .locator('.standard-preview-svg')
      .getAttribute('data-state-checksum');
    await page.getByRole('button', { name: 'Комната с окном' }).click();
    await page.getByRole('slider', { name: 'Положение изделия' }).fill('42');
    await expect(page.locator('.standard-preview-svg')).not.toHaveAttribute(
      'data-state-checksum',
      checksum ?? '',
    );
    await page.getByRole('link', { name: '← Вернуться в конфигуратор' }).click();
    await expect(page).toHaveURL('/configure?resume=preview');
    await expect(page.getByRole('heading', { name: 'Количество' })).toBeVisible();
    await expect(page.getByText('MINI', { exact: true })).toBeVisible();
    await expect(page.getByText('400 × 500 мм', { exact: true })).toBeVisible();
  });

  for (const family of supportedFamilies) {
    test(`renders stable ${family} scene from a real local material`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Visual baselines use fixed Chromium.');
      await page.setViewportSize({ height: 900, width: 1280 });
      await createPreview(page, family);
      await expect(page.locator('.preview-canvas-frame')).toHaveScreenshot(
        `${family.toLowerCase()}-window.png`,
        {
          animations: 'disabled',
          maxDiffPixelRatio: 0.005,
        },
      );
    });
  }

  test('switches scene and exposes only family-relevant controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'One browser covers deterministic controls.');
    await createPreview(page, 'ZEBRA');
    await expect(page.getByRole('slider', { name: 'Совмещение полос' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Угол ламелей' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Комната с окном' }).click();
    await expect(page.locator('.standard-preview-svg')).toHaveAttribute(
      'data-scene',
      'ROOM_WINDOW',
    );
    await page.getByRole('slider', { name: 'Совмещение полос' }).fill('73');
    await expect(page.getByText('73%', { exact: true })).toBeVisible();
  });

  test('remains one-hand operable without horizontal overflow on mobile', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Fixed mobile viewport is verified once.');
    await page.setViewportSize({ height: 812, width: 375 });
    await createPreview(page, 'VERTICAL');
    await expect(page.getByRole('slider', { name: 'Степень раздвижения' })).toBeVisible();
    await page.getByRole('slider', { name: 'Степень раздвижения' }).fill('35');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const target = await page
      .getByRole('link', { name: '← Вернуться в конфигуратор' })
      .boundingBox();
    expect(target?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('discloses unavailable and color-only fallbacks without a random texture', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Fallback contract is browser-independent.');
    const token = 'u'.repeat(32);
    const baseState: StandardPreviewStateResponse = {
      asset: { normalizedColor: null, quality: 'PREVIEW_UNAVAILABLE', url: null },
      configuration: {
        dimensions: { heightMm: 1_100, widthMm: 700 },
        family: {
          code: 'WOODEN',
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Деревянные жалюзи',
        },
        hardware: { color: '#FFFFFF', label: 'Белая', optionId: 'white' },
        material: {
          article: 'WOOD-1',
          colorName: 'Дуб',
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Дуб',
        },
        model: { code: 'WOOD', id: '00000000-0000-4000-8000-000000000003', name: 'Дерево' },
        system: { id: '00000000-0000-4000-8000-000000000004', name: 'WOOD' },
      },
      controls: {
        openingPosition: 100,
        slatAngle: 0,
        verticalSpread: 100,
        zebraAlignment: 50,
        zoom: 100,
      },
      correlationId: 'browser-fallback',
      createdAt: '2026-08-08T12:00:00.000Z',
      csrfToken: 'x'.repeat(64),
      eligibility: { eligible: false, reason: 'UNSUPPORTED_FAMILY', warnings: [] },
      family: null,
      familyParameters: {
        controlSide: null,
        hasCassette: false,
        hasGuides: false,
        horizontalSlatWidthMm: null,
        verticalLamellaWidthMm: null,
        verticalOpeningDirection: null,
      },
      id: token,
      rendererVersion: 'standard-svg-v2',
      sceneId: 'WINDOW_CLOSEUP',
      stateChecksum: 'f'.repeat(64),
      stateVersion: 1,
      updatedAt: '2026-08-08T12:00:00.000Z',
    };
    let current = baseState;
    await page.route(`**/api/v1/previews/${token}`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify(current),
      });
    });
    await page.route('**/api/v1/previews/scenes', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          correlationId: 'browser-scenes',
          scenes: [
            { description: 'Окно', id: 'WINDOW_CLOSEUP', label: 'Окно крупным планом', version: 2 },
            { description: 'Комната', id: 'ROOM_WINDOW', label: 'Комната с окном', version: 2 },
          ],
        }),
      });
    });
    await page.goto(`/preview?state=${token}`);
    await expect(
      page.getByText('Для этого материала стандартная примерка пока недоступна'),
    ).toBeVisible();
    await expect(page.locator('[data-family-renderer]')).toHaveCount(0);

    current = {
      ...baseState,
      asset: { normalizedColor: '#7A6048', quality: 'NORMALIZED_COLOR_ONLY', url: null },
      configuration: {
        ...baseState.configuration,
        family: { ...baseState.configuration.family, code: 'ROLLER', name: 'Рулонные шторы' },
      },
      eligibility: { eligible: true, reason: 'ELIGIBLE', warnings: [] },
      family: 'ROLLER',
    };
    await page.reload();
    await expect(
      page.getByText('Предварительное отображение цвета без точной фактуры'),
    ).toBeVisible();
    await expect(page.locator('[data-preview-layer="supplier-interior"]')).toBeVisible();
    await expect(page.locator('[data-preview-layer="material-source"]')).toHaveCount(0);
    await expect(page.locator('[data-family-renderer="ROLLER"]')).toBeVisible();
  });

  test('recovers honestly when the local material asset cannot be decoded', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Recovery contract is browser-independent.');
    await page.route(
      /\/api\/v1\/previews\/[A-Za-z0-9_-]{32}\/layers\/MATERIAL_VISUALIZATION/u,
      async (route) => {
        await route.fulfill({ body: 'not-an-image', contentType: 'image/webp', status: 200 });
      },
    );
    await createPreview(page, 'ROLLER', false);
    await expect(
      page.getByText('Локальный файл материала временно не загрузился. Попробуйте ещё раз.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить загрузку' })).toBeVisible();
  });
});
