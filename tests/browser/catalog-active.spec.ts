import { expect, test } from '@playwright/test';

test.describe('PLAN-1B2-VERIFY-001 active full catalog browser acceptance', () => {
  test.skip(
    process.env['CATALOG_ACTIVE_BROWSER'] !== 'true',
    'Runs only against the isolated active-catalog acceptance environment.',
  );

  test('navigates hierarchy, filters, cursor, detail, media and share-safe URL', async ({
    page,
    request,
  }, testInfo) => {
    const listResponse = await page.goto('/catalog?limit=2');

    expect(listResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Свет сначала');
    await expect(page.getByLabel('Статус каталога')).toContainText('v7001');
    await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.catalog-card')).toHaveCount(2);
    await expect(page.getByRole('navigation', { name: 'Иерархия категорий' })).toContainText(
      'Рулонные шторы',
    );
    await expect(page.getByRole('navigation', { name: 'Иерархия категорий' })).toContainText(
      'Blackout',
    );
    await expect(page.locator('body')).not.toContainText('shop.amigo.ru');

    const nextPage = page.getByRole('link', { name: /Следующая страница/ });
    await expect(nextPage).toBeVisible();
    await nextPage.click();
    await expect(page).toHaveURL(/\/catalog\?.*cursor=/);
    await expect(page.locator('.catalog-card')).toHaveCount(2);
    await expect(page.locator('body')).toContainText('TEST-103');
    await expect(page.locator('body')).toContainText('TEST-104');

    await page.goto('/catalog?category=blackout');
    await expect(page.getByRole('navigation', { name: 'Выбранная категория' })).toContainText(
      'Blackout',
    );
    await expect(page.locator('.catalog-card')).toHaveCount(1);
    await expect(page.locator('body')).toContainText('TEST-102');

    await page.goto('/catalog');
    await page.locator('input[name="q"]').fill('Ноктюрн');
    await page.locator('select[name="sort"]').selectOption('price-desc');
    await page.getByRole('button', { name: 'Показать' }).click();
    await expect(page).toHaveURL(/q=%D0%9D%D0%BE%D0%BA%D1%82%D1%8E%D1%80%D0%BD/);
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect(page.locator('.catalog-card')).toHaveCount(1);

    await page.getByRole('link', { name: 'Открыть Ноктюрн, графит' }).click();
    await expect(page).toHaveURL(/\/catalog\/noktyurn-grafit$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ноктюрн');
    await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })).toContainText(
      'Рулонные шторы',
    );
    await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })).toContainText(
      'Blackout',
    );
    await expect(page.locator('.catalog-detail-price strong')).toContainText(/1\s*899/);
    await expect(page.locator('body')).toContainText('CatalogVersion v7001');

    const materialImage = page.locator('.catalog-detail-media img');
    await expect(materialImage).toBeVisible();
    await expect
      .poll(() =>
        materialImage.evaluate(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);

    const shareButton = page.getByRole('button', { name: 'Скопировать ссылку' });
    await shareButton.click();
    await expect
      .poll(() => page.locator('.catalog-share-control').innerText())
      .toMatch(/Ссылка скопирована|Не удалось скопировать/i);
    expect(page.url()).toMatch(/\/catalog\/noktyurn-grafit$/);

    const detailApi = await request.get('/api/v1/catalog/materials/noktyurn-grafit');
    expect(detailApi.status()).toBe(200);
    expect(detailApi.headers()['x-catalog-version']).toBe('00000000-0000-4000-8000-00000000b004');
    const etag = detailApi.headers()['etag'];
    expect(etag).toBeTruthy();
    const notModified = await request.get('/api/v1/catalog/materials/noktyurn-grafit', {
      headers: { 'if-none-match': etag ?? '' },
    });
    expect(notModified.status()).toBe(304);

    const materialPayload = await detailApi.json();
    const mediaResponse = await request.get(materialPayload.item.media.url);
    expect(mediaResponse.status()).toBe(200);
    expect(mediaResponse.headers()['content-type']).toContain('image/png');
    expect(mediaResponse.headers()['x-catalog-version']).toBe(
      '00000000-0000-4000-8000-00000000b004',
    );

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
