import { expect, test, type Browser, type Page } from '@playwright/test';

const enabled = process.env['PHASE1E_BROWSER'] === 'true';
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:3000';

async function chooseCalculatedRoller(page: Page) {
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
  await expect(page.getByText('Стоимость рассчитана', { exact: true })).toBeVisible();
}

async function addPriceOnRequest(page: Page) {
  await page.goto('/configure');
  await page.evaluate(() => globalThis.sessionStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /ZIP системы для террас Цена по запросу/ }).click();
  await page.getByRole('button', { name: 'Продолжить →' }).click();
  await page.getByRole('spinbutton').fill('1');
  await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
  await expect(page.locator('.pricing-status')).toHaveText('Стоимость уточнит менеджер');
  await expect(page.getByText('0,00 ₽')).toHaveCount(0);
  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await expect(page.getByText('Изделие сохранено по этому расчёту.')).toBeVisible();
}

async function assertNoOverlay(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.querySelector(
          '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
        ) === null,
    ),
  ).toBe(true);
}

async function assertForeignGuestCannotRead(browser: Browser, editHref: string): Promise<void> {
  const context = await browser.newContext({ baseURL });
  try {
    const response = await context.request.get(
      `/api/v1/cart/items/${new URL(editHref, baseURL).searchParams.get('edit')}/edit-source`,
    );
    expect([400, 403, 404]).toContain(response.status());
    const foreignCart = await context.request.get('/api/v1/cart');
    expect((await foreignCart.json()) as { items: unknown[] }).toMatchObject({ items: [] });
  } finally {
    await context.close();
  }
}

test.describe('QG-355..QG-360 Phase 1E browser acceptance', () => {
  test.skip(!enabled, 'Runs against the real local Phase 1E catalog and services.');
  test.setTimeout(120_000);

  test('completes calculated + request-price cart, guest checkout, WhatsApp and admin intake', async ({
    browser,
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'One real Chromium flow covers Phase 1E.');
    const ownerToken = process.env['PHASE1E_OWNER_TOKEN'];
    if (ownerToken === undefined) throw new Error('PHASE1E_OWNER_TOKEN_REQUIRED');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(baseURL).origin,
    });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await chooseCalculatedRoller(page);
    await page.getByRole('button', { name: 'Посмотреть на окне' }).click();
    await expect(page).toHaveURL(/\/preview\?state=[A-Za-z0-9_-]{32}&quote=[A-Za-z0-9_-]{32}$/u);
    const quoteToken = new URL(page.url()).searchParams.get('quote');
    if (quoteToken === null) throw new Error('QUOTE_TOKEN_REQUIRED');
    await expect(page.locator('[data-family-renderer="ROLLER"]')).toBeVisible();
    await page.getByRole('button', { name: 'Добавить в корзину' }).click();
    await expect(page.getByText('Изделие добавлено с текущей примеркой.')).toBeVisible();

    await addPriceOnRequest(page);
    await page.getByRole('link', { name: 'Открыть корзину →' }).click();
    await expect(page).toHaveURL('/cart');
    await expect(page.locator('.cart-item-card')).toHaveCount(2);
    await expect(
      page.getByRole('heading', { name: 'Часть суммы требует уточнения' }),
    ).toBeVisible();
    await expect(page.getByText('Часть стоимости уточнит менеджер.')).toBeVisible();
    await expect(page.getByText('Сумму уточним')).toBeVisible();
    await assertNoOverlay(page);

    const cartState = (await (await page.request.get('/api/v1/cart')).json()) as {
      cartRevision: number;
      csrfToken: string;
      items: { editHref: string }[];
    };
    const mutationHeaders = {
      Origin: new URL(baseURL).origin,
      'X-CSRF-Token': cartState.csrfToken,
    };
    const tamperedPrice = await page.request.post('/api/v1/cart/items', {
      data: { grandTotalKopecks: 1, quoteToken },
      headers: { ...mutationHeaders, 'Idempotency-Key': `browser-price-${crypto.randomUUID()}` },
    });
    expect(tamperedPrice.status()).toBe(400);
    const missingCsrf = await page.request.post('/api/v1/cart/items', {
      data: { quoteToken },
      headers: {
        'Idempotency-Key': `browser-csrf-${crypto.randomUUID()}`,
        Origin: new URL(baseURL).origin,
      },
    });
    expect(missingCsrf.status()).toBe(403);
    const firstEditHref = cartState.items[0]?.editHref;
    if (firstEditHref === undefined) throw new Error('EDIT_HREF_REQUIRED');
    await assertForeignGuestCannotRead(browser, firstEditHref);
    await page.reload();
    await expect(page.locator('.cart-item-card')).toHaveCount(2);

    const calculatedCard = page
      .locator('.cart-item-card')
      .filter({ hasText: 'Стоимость рассчитана' })
      .first();
    await calculatedCard.getByRole('button', { name: 'Дублировать' }).click();
    await expect(page.locator('.cart-item-card')).toHaveCount(3);
    const calculatedCards = page
      .locator('.cart-item-card')
      .filter({ hasText: 'Стоимость рассчитана' });
    await calculatedCards.last().getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('.cart-item-card')).toHaveCount(2);

    await calculatedCards.first().getByRole('link', { name: 'Изменить' }).click();
    await expect(page.getByRole('heading', { name: 'Количество' })).toBeVisible();
    await page.getByRole('spinbutton').fill('3');
    await page.getByRole('button', { name: 'Рассчитать на сервере' }).click();
    await page.getByRole('button', { name: 'Добавить в корзину' }).click();
    await page.getByRole('link', { name: 'Открыть корзину →' }).click();
    await expect(page.locator('.cart-item-card')).toHaveCount(2);
    await expect(
      page.locator('.cart-item-card').filter({ hasText: 'Стоимость рассчитана' }),
    ).toContainText('Количество3');

    await page.setViewportSize({ height: 812, width: 375 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('phase1e-cart-mobile.png'), fullPage: true });
    const checkoutLink = page.getByRole('link', { name: 'Оформить заявку' });
    expect((await checkoutLink.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await checkoutLink.click();
    await expect(page).toHaveURL('/checkout');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    const contactName = `Тестовый Клиент ${crypto.randomUUID().slice(0, 8)}`;
    const contactPhone = '+7 999 000-00-01';
    await page.getByLabel('Имя').fill(contactName);
    await page.getByLabel('Телефон').fill(contactPhone);
    await page.getByLabel('Населённый пункт').fill('Грозный');
    await page.getByLabel('Адрес необязательно').fill('Синтетический адрес 1');
    await page.getByLabel('Комментарий необязательно').fill('Синтетический browser test');
    await page.getByLabel('Нужен бесплатный замер').check();
    await page.getByLabel(/Интересует рассрочка/).check();
    await page.getByLabel(/Согласен на обработку/).check();
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(page.getByText('Заявка сохранена')).toBeVisible();
    await expect(page.getByText('Бесплатный замер запрошен')).toBeVisible();
    await expect(page.getByText('Узнать условия рассрочки')).toBeVisible();
    const requestText = await page.locator('.request-number').textContent();
    const requestNumber = requestText?.match(/REQ-[0-9]{6}-[A-Z2-9]{8}/u)?.[0];
    if (requestNumber === undefined) throw new Error('REQUEST_NUMBER_REQUIRED');

    const whatsappLink = page.getByRole('link', { name: 'Отправить в WhatsApp' });
    await expect(whatsappLink).toBeVisible();
    const whatsappHref = await whatsappLink.getAttribute('href');
    expect(whatsappHref).toMatch(/^https:\/\/wa\.me\/79635851036\?text=/u);
    expect(whatsappHref).not.toContain('79999999999');
    await page.getByRole('button', { name: 'Скопировать сообщение' }).click();
    await expect(page.getByText('Сообщение скопировано.')).toBeVisible();
    await context.route('https://wa.me/**', async (route) => {
      await route.fulfill({ body: 'WhatsApp handoff opened', contentType: 'text/plain' });
    });
    const popupPromise = page.waitForEvent('popup');
    await whatsappLink.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    expect(popup.url()).toMatch(/^https:\/\/wa\.me\/79635851036\?text=/u);
    await popup.close();
    await page.waitForTimeout(300);

    const publicSummaryHref = await page
      .getByRole('link', { name: 'Открыть резюме заявки' })
      .getAttribute('href');
    if (publicSummaryHref === null) throw new Error('PUBLIC_SUMMARY_REQUIRED');
    const publicReference = publicSummaryHref.slice('/request/'.length);
    const receiptCartState = (await (await page.request.get('/api/v1/cart')).json()) as {
      csrfToken: string;
    };
    const recipientTamper = await page.request.post(`/api/v1/requests/${publicReference}/handoff`, {
      data: { recipient: '79999999999' },
      headers: {
        Origin: new URL(baseURL).origin,
        'Idempotency-Key': `browser-recipient-${crypto.randomUUID()}`,
        'X-CSRF-Token': receiptCartState.csrfToken,
      },
    });
    expect(recipientTamper.status()).toBe(400);
    const enumerated = `${publicReference.slice(0, -1)}${publicReference.endsWith('x') ? 'y' : 'x'}`;
    expect((await page.request.get(`/api/v1/requests/public/${enumerated}`)).status()).toBe(404);
    expect((await page.request.get('/api/v1/admin/requests')).status()).toBe(403);

    await page.goto(publicSummaryHref);
    await expect(page.getByRole('heading', { name: requestNumber })).toBeVisible();
    await expect(page.getByText('2–7 календарных дней')).toBeVisible();
    await expect(page.getByText('12 месяцев')).toBeVisible();
    await expect(page.getByText(contactName)).toHaveCount(0);
    await expect(page.getByText(contactPhone)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto('/admin/requests');
    await page.getByLabel('Ключ OWNER / ADMIN / MANAGER').fill(ownerToken);
    await page.getByRole('button', { name: 'Открыть сессию' }).click();
    await expect(page.getByText(requestNumber, { exact: true })).toBeVisible();
    const requestRow = page.locator('.request-admin-row').filter({ hasText: requestNumber });
    await requestRow.getByRole('link', { name: 'Открыть' }).click();
    await expect(page.getByRole('heading', { name: requestNumber })).toBeVisible();
    await page.getByRole('button', { name: 'Скопировать телефон' }).click();
    await expect(page.getByRole('button', { name: 'Телефон скопирован' })).toBeVisible();
    await expect(page.getByText('Ссылка WhatsApp открыта')).toBeVisible();
    await expect(page.getByText('Сообщение скопировано')).toBeVisible();
    await page.getByLabel('Статус').selectOption('IN_REVIEW');
    await page.getByRole('button', { name: 'Сохранить статус' }).click();
    await expect(page.getByText('Статус заявки обновлён.')).toBeVisible();
    await page.getByLabel('Новая заметка').fill('Browser acceptance: связаться после проверки');
    await page.getByRole('button', { name: 'Добавить заметку' }).click();
    await expect(page.getByText('Внутренняя заметка добавлена.')).toBeVisible();
    await expect(page.getByText('Browser acceptance: связаться после проверки')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Открыть WhatsApp' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/79635851036\?text=/u,
    );
    await assertNoOverlay(page);
    expect(consoleErrors).toEqual([]);
  });
});
