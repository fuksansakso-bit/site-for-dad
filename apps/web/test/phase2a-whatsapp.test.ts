import { describe, expect, it } from 'vitest';
import { createWhatsAppUrl, WHATSAPP_PHONE } from '../lib/phase2a/whatsapp';
describe('WhatsApp handoff', () => {
  it('prepares a URL for the fixed number without claiming delivery', () => {
    const url = createWhatsAppUrl(
      'REQ-20260812-ABC123',
      [
        {
          materialSlug: 'material',
          widthMm: 1000,
          heightMm: 1200,
          quantity: 1,
          name: 'Материал',
          article: 'A1',
          pricingStatus: 'KNOWN',
          unitPriceKopecks: 200000,
          totalPriceKopecks: 200000,
        },
      ],
      200000,
    );
    expect(url).toContain(`wa.me/${WHATSAPP_PHONE}`);
    expect(decodeURIComponent(url)).toContain('Хочу обсудить заявку');
    expect(decodeURIComponent(url)).not.toMatch(/отправлено|доставлено/);
  });
});
