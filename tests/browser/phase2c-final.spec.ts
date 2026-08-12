import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baselineDirectory = resolve('.local/phase2c-baselines');
const zebraMaterialSlug = 'amigo-material-12114';

async function expectSafePage(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), path).toBe(200);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /SQLSTATE|service[_ -]?role|row level security|SUPABASE_SERVICE_ROLE_KEY|AMIGO_EXACT/u,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `${path} has horizontal overflow`,
  ).toBe(true);
}

async function capture(page: Page, name: string) {
  await mkdir(baselineDirectory, { recursive: true });
  await page.screenshot({
    animations: 'disabled',
    fullPage: false,
    path: resolve(baselineDirectory, `${name}.png`),
  });
}

async function selectZebraAndCalculate(page: Page) {
  await expectSafePage(page, '/calculator');
  await page.getByRole('tab', { name: 'День-ночь / Зебра' }).click();
  await page.getByRole('searchbox', { name: 'Найти ткань, цвет или артикул' }).fill('СКРИН 0225');
  const option = page.getByRole('option', { name: /зебра СКРИН 0225.*от 3 869 ₽/u });
  await expect(option).toBeVisible();
  await option.click();
  await page.getByRole('spinbutton', { name: 'Ширина, мм' }).fill('1000');
  await page.getByRole('spinbutton', { name: 'Высота, мм' }).fill('1000');
  await page.getByRole('button', { name: 'Рассчитать стоимость' }).click();
  await expect(page.getByText('Точная стоимость одного изделия')).toBeVisible();
  await expect(page.getByText('11 850 ₽', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Цена получена из текущего калькулятора AMIGO для выбранного материала и размеров.',
    ),
  ).toBeVisible();
}

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes('records local lab performance observations')) return;
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('Zebra material produces an exact AMIGO amount and is repriced in cart', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await selectZebraAndCalculate(page);
  await expect(page.locator('select')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    /Стоимость уточнит менеджер|Стоимость рассчитает менеджер|Минимум за изделие/u,
  );
  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'зебра СКРИН 0225 — белый' })).toBeVisible();
  await expect(page.getByText('11 850 ₽', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Цена рассчитана', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Перейти к заявке' })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('premium listboxes replace native selects and support keyboard control', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 360 });
  await expectSafePage(page, '/catalog');
  await expect(page.locator('select')).toHaveCount(0);

  const sorting = page.getByRole('combobox', { name: /Сортировка/u });
  await sorting.press('Enter');
  await page.getByRole('option', { name: 'По умолчанию' }).press('End');
  await page.getByRole('option', { name: 'Сначала дороже' }).press('Enter');
  await expect(page.getByRole('combobox', { name: /Сортировка Сначала дороже/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сбросить фильтры' })).toBeVisible();
});

test('all required viewports reflow without clipping and reduced motion remains usable', async ({
  page,
}) => {
  const viewports = [
    { height: 568, width: 320 },
    { height: 800, width: 360 },
    { height: 812, width: 375 },
    { height: 844, width: 390 },
    { height: 932, width: 430 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 800, width: 1280 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
  ];

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/catalog', '/calculator', '/visualizer', '/admin/login']) {
      await expectSafePage(page, path);
    }
  }
});

test('required public and staff entry routes render with final safe states', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  for (const path of [
    '/',
    '/catalog',
    `/catalog/${zebraMaterialSlug}`,
    '/calculator',
    '/cart',
    '/checkout',
    '/portfolio',
    '/visualizer',
    '/admin/login',
  ]) {
    await expectSafePage(page, path);
  }
  const missing = await page.goto('/request/not-a-reference');
  expect(missing?.status()).toBe(404);
});

test('thirteen stable visual baselines are captured for review', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.setViewportSize({ height: 900, width: 1440 });
  await expectSafePage(page, '/');
  await capture(page, '01-landing-desktop');
  await expectSafePage(page, '/catalog');
  await capture(page, '02-catalog-desktop');
  await expectSafePage(page, `/catalog/${zebraMaterialSlug}`);
  await capture(page, '03-material-desktop');
  await selectZebraAndCalculate(page);
  await capture(page, '04-calculator-result-desktop');
  await expectSafePage(page, '/visualizer');
  await capture(page, '05-visualizer-desktop');
  await expectSafePage(page, '/admin/login');
  await capture(page, '06-admin-login-desktop');

  await page.setViewportSize({ height: 844, width: 390 });
  await expectSafePage(page, '/');
  await capture(page, '07-landing-mobile');
  await expectSafePage(page, '/catalog');
  await capture(page, '08-catalog-mobile');
  await expectSafePage(page, `/catalog/${zebraMaterialSlug}`);
  await capture(page, '09-material-mobile');
  await selectZebraAndCalculate(page);
  await capture(page, '10-calculator-result-mobile');
  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await expectSafePage(page, '/cart');
  await expect(page.getByRole('heading', { name: 'зебра СКРИН 0225 — белый' })).toBeVisible();
  await expect(page.getByText('11 850 ₽', { exact: true }).first()).toBeVisible();
  await capture(page, '11-cart-mobile');
  await expectSafePage(page, '/visualizer');
  await capture(page, '12-visualizer-mobile');
  await expectSafePage(page, '/admin/login');
  await capture(page, '13-admin-login-mobile');
});

test('records local lab performance observations without claiming field metrics', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const browserGlobal = globalThis as typeof globalThis & {
      __phase2cLab?: {
        cls: number;
        lcpMs: number;
        longTaskCount: number;
        maxEventDurationMs: number;
      };
    };
    const lab = { cls: 0, lcpMs: 0, longTaskCount: 0, maxEventDurationMs: 0 };
    browserGlobal.__phase2cLab = lab;
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) lab.lcpMs = Math.max(lab.lcpMs, entry.startTime);
      }).observe({ buffered: true, type: 'largest-contentful-paint' });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) lab.cls += shift.value ?? 0;
        }
      }).observe({ buffered: true, type: 'layout-shift' });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver((list) => {
        lab.longTaskCount += list.getEntries().length;
      }).observe({ buffered: true, type: 'longtask' });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('event')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lab.maxEventDurationMs = Math.max(lab.maxEventDurationMs, entry.duration);
        }
      }).observe({
        buffered: true,
        durationThreshold: 16,
        type: 'event',
      } as PerformanceObserverInit);
    }
  });

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3_200);
  const observations = await page.evaluate(() => {
    const browserGlobal = globalThis as typeof globalThis & {
      __phase2cLab?: {
        cls: number;
        lcpMs: number;
        longTaskCount: number;
        maxEventDurationMs: number;
      };
    };
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const image = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/_next/image'))
      .map((entry) => entry as PerformanceResourceTiming)
      .sort((left, right) => right.encodedBodySize - left.encodedBodySize)[0];
    return {
      ...browserGlobal.__phase2cLab,
      imageResourceCount: performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/_next/image')).length,
      imageSampleBytes: Math.max(
        image?.encodedBodySize ?? 0,
        image?.transferSize ?? 0,
        image?.decodedBodySize ?? 0,
      ),
      imageSampleDurationMs: image?.duration ?? 0,
      navigationDurationMs: navigation?.duration ?? 0,
    };
  });

  expect(observations.lcpMs).toBeGreaterThan(0);
  expect(observations.lcpMs).toBeLessThan(6_000);
  expect(observations.cls).toBeLessThan(0.25);
  expect(observations.navigationDurationMs).toBeGreaterThan(0);
  expect(observations.imageResourceCount).toBeGreaterThan(0);
  expect(observations.imageSampleBytes).toBeGreaterThan(0);
  await mkdir(resolve('.local'), { recursive: true });
  await writeFile(
    resolve('.local/phase2c-performance.json'),
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        environment: testInfo.project.name,
        fieldMetricsClaimed: false,
        observations,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
});
