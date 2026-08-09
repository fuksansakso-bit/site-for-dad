import { describe, expect, it } from 'vitest';

import { businessWhatsAppRecipient, createWhatsAppHandoff } from '../src/index.js';

describe('WhatsApp handoff', () => {
  const input = {
    installmentInterest: true,
    items: [
      {
        family: 'Рулонные шторы',
        heightMm: 1400,
        material: 'Альфа',
        materialArticle: 'A-101',
        model: 'Мини',
        quantity: 2,
        quantityTotalKopecks: 317_000,
        system: 'AMIGO',
        widthMm: 900,
      },
      {
        family: 'Вертикальные жалюзи',
        heightMm: null,
        material: 'Уточняется',
        materialArticle: 'REQ-ART',
        model: 'Подбор менеджером',
        quantity: 1,
        quantityTotalKopecks: null,
        system: 'Подбор менеджером',
        widthMm: null,
      },
    ],
    knownSubtotalKopecks: 317_000,
    locality: 'Грозный',
    measurementRequested: true,
    pricingStatus: 'PARTIALLY_PRICED' as const,
    publicSummaryUrl: 'http://127.0.0.1:3000/request/abcdefghijklmnopqrstuvwxyzABCDEFG1234567890_',
    requestNumber: 'REQ-260809-ABCDEFGH',
    totalQuantity: 3,
    unknownItemCount: 1,
  };

  it('uses the fixed business recipient and an encoded readable message', () => {
    const handoff = createWhatsAppHandoff(input);
    expect(handoff.recipient).toBe(businessWhatsAppRecipient);
    expect(handoff.whatsappUrl).toMatch(/^https:\/\/wa\.me\/79635851036\?text=/u);
    expect(decodeURIComponent(handoff.whatsappUrl.replaceAll('+', ' '))).toContain(
      'REQ-260809-ABCDEFGH',
    );
    expect(handoff.message).toContain('Часть стоимости уточнит менеджер');
    expect(handoff.message).toContain('Нужен бесплатный замер');
    expect(handoff.message).toContain('условия рассрочки');
    expect(handoff.message).toContain('900×1400 мм');
  });

  it('does not expose internal or delivery claims', () => {
    const message = createWhatsAppHandoff(input).message;
    expect(message).not.toMatch(/PriceVersion|CatalogVersion|UUID|storage|доставлено|отправлено/iu);
    expect(message).not.toContain('+79000000000');
  });
});
