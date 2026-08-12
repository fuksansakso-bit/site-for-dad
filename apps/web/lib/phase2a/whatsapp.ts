import { formatMoney } from './pricing';
import type { PricedItem } from './types';
export const WHATSAPP_PHONE = '79635851036';
export function createWhatsAppUrl(reference: string, items: PricedItem[], total: number | null) {
  const lines = [
    `Здравствуйте! Хочу обсудить заявку ${reference}.`,
    ...items.map(
      (item) =>
        `${item.name} (${item.article}), ${item.widthMm}×${item.heightMm} мм, ${item.quantity} шт.`,
    ),
    total === null
      ? 'Стоимость уточнит менеджер.'
      : `Предварительная стоимость: ${formatMoney(total)}.`,
  ];
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`;
}
