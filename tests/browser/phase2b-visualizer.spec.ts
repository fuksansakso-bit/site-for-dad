import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const publicReference = 'a'.repeat(48);
const jobId = '00000000-0000-4000-8000-000000000123';
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('completes mock visualizer UI, before/after, cart, retry, delete and mobile viewports', async ({
  page,
}) => {
  let statusPolls = 0;
  let generationCalls = 0;
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        headers: {
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
          'Access-Control-Allow-Origin': '*',
        },
        status: 204,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ Key: `ai-inputs/${jobId}/window.jpg` }),
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });
  });
  await page.route('**/api/ai-visualizations/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/jobs') && method === 'POST') {
      await route.fulfill({
        json: {
          attemptNumber: 0,
          expiresAt: '2099-01-01T00:00:00.000Z',
          publicReference,
          reused: false,
          status: 'CREATED',
        },
        status: 201,
      });
      return;
    }
    if (url.pathname.endsWith('/upload') && method === 'POST') {
      await route.fulfill({
        json: {
          bucket: 'ai-inputs',
          expiresInSeconds: 7200,
          path: `${jobId}/window.jpg`,
          signedUrl: 'http://127.0.0.1:54321/storage/v1/object/upload/sign/ai-inputs/window?token=x',
          token: 'signed-upload-token',
        },
      });
      return;
    }
    if (url.pathname.endsWith('/upload/confirm') && method === 'POST') {
      await route.fulfill({ json: { publicReference, status: 'READY' } });
      return;
    }
    if (url.pathname.endsWith('/generate') && method === 'POST') {
      generationCalls += 1;
      await route.fulfill({
        json: {
          attemptNumber: 1,
          errorCode: null,
          errorMessage: null,
          expiresAt: '2099-01-01T00:00:00.000Z',
          publicReference,
          resultAvailable: false,
          reused: false,
          status: 'PROCESSING',
        },
        status: 202,
      });
      return;
    }
    if (url.pathname.endsWith('/retry') && method === 'POST') {
      await route.fulfill({
        json: {
          attemptNumber: 1,
          errorCode: null,
          errorMessage: null,
          expiresAt: '2099-01-01T00:00:00.000Z',
          publicReference,
          resultAvailable: true,
          reused: true,
          status: 'SUCCEEDED',
        },
      });
      return;
    }
    if (url.pathname.endsWith('/result') && method === 'GET') {
      await route.fulfill({ json: { expiresInSeconds: 300, inputUrl: pixel, resultUrl: pixel } });
      return;
    }
    if (url.pathname === `/api/ai-visualizations/${publicReference}` && method === 'GET') {
      statusPolls += 1;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 120));
      await route.fulfill({
        json: {
          attemptNumber: 1,
          errorCode: null,
          errorMessage: null,
          expiresAt: '2099-01-01T00:00:00.000Z',
          publicReference,
          resultAvailable: statusPolls > 1,
          reused: false,
          status: statusPolls > 1 ? 'SUCCEEDED' : 'PROCESSING',
        },
      });
      return;
    }
    if (url.pathname === `/api/ai-visualizations/${publicReference}` && method === 'DELETE') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.abort('failed');
  });

  await page.goto('/visualizer?material=phase2b-e2e');
  await expect(page.getByRole('heading', { name: 'Примерьте жалюзи на своём окне' })).toBeVisible();
  for (const width of [320, 360, 375, 390, 430]) {
    await page.setViewportSize({ height: 844, width });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `horizontal overflow at ${width}px`,
    ).toBe(true);
  }

  const dimensions = page.getByRole('spinbutton');
  await dimensions.nth(0).fill('1200');
  await dimensions.nth(1).fill('1600');
  await page.getByRole('button', { name: 'Продолжить с этим материалом' }).click();
  const fileInputs = page.locator('input[type=file]');
  await expect(fileInputs.nth(0)).toHaveAttribute('accept', 'image/*');
  await expect(fileInputs.nth(0)).toHaveAttribute('capture', 'environment');
  await expect(fileInputs.nth(1)).toHaveAttribute('accept', 'image/*');
  await fileInputs.nth(1).setInputFiles(
    resolve(
      'tests/browser/standard-preview.spec.ts-snapshots/roller-window-chromium-win32.png',
    ),
  );
  await expect(page.getByAltText('Выбранная фотография окна')).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  const generate = page.getByRole('button', { name: 'Создать визуализацию' });
  await expect(generate).toBeDisabled();
  await page.getByLabel('Я согласен на обработку фотографии для создания визуализации.').check();
  await expect(generate).toBeEnabled();
  await generate.dblclick();
  await expect(page.getByText(/Создаём визуализацию|Обрабатываем результат/u)).toBeVisible();
  await expect(page.getByText('Сравнить «До / После»')).toBeVisible({ timeout: 15_000 });
  expect(generationCalls).toBe(1);
  expect(statusPolls).toBeGreaterThanOrEqual(2);
  const comparison = page.getByLabel('Положение сравнения до и после');
  await comparison.fill('72');
  await expect(comparison).toHaveValue('72');
  expect((await comparison.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await expect(page.getByText('Материал добавлен в корзину.')).toBeVisible();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('phase2a-cart') ?? '[]'));
  expect(cart).toEqual([
    {
      aiVisualizationPublicReference: publicReference,
      heightMm: 1600,
      materialSlug: 'phase2b-e2e',
      quantity: 1,
      widthMm: 1200,
    },
  ]);

  await page.getByRole('button', { name: 'Создать ещё вариант' }).click();
  await expect(page.getByText(/готовый вариант|платный запуск/u)).toBeVisible();
  expect(generationCalls).toBe(1);
  await page.getByRole('button', { name: 'Удалить фотографию' }).click();
  await expect(page.getByRole('heading', { name: 'Фотография и результат больше недоступны' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

