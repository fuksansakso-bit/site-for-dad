export const businessWhatsAppRecipient = '79635851036' as const;

export interface WhatsAppHandoffItem {
  readonly family: string;
  readonly heightMm: number | null;
  readonly material: string;
  readonly materialArticle: string;
  readonly model: string;
  readonly quantity: number;
  readonly quantityTotalKopecks: number | null;
  readonly system: string;
  readonly widthMm: number | null;
}

export interface WhatsAppHandoffInput {
  readonly installmentInterest: boolean;
  readonly items: readonly WhatsAppHandoffItem[];
  readonly knownSubtotalKopecks: number;
  readonly locality: string;
  readonly measurementRequested: boolean;
  readonly pricingStatus: 'FULLY_PRICED' | 'PARTIALLY_PRICED' | 'PRICE_ON_REQUEST';
  readonly publicSummaryUrl: string;
  readonly requestNumber: string;
  readonly totalQuantity: number;
  readonly unknownItemCount: number;
}

export interface WhatsAppHandoff {
  readonly message: string;
  readonly recipient: typeof businessWhatsAppRecipient;
  readonly whatsappUrl: string;
}

const rubles = new Intl.NumberFormat('ru-RU', {
  currency: 'RUB',
  maximumFractionDigits: 0,
  style: 'currency',
});

function safeLineValue(value: string, maximum = 120): string {
  const printable = [...value]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('');
  const compact = printable.replace(/\s+/gu, ' ').trim();
  if (compact.length === 0) throw new TypeError('WHATSAPP_MESSAGE_INPUT_INVALID');
  return compact.slice(0, maximum);
}

function formatMoney(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) {
    throw new TypeError('WHATSAPP_MESSAGE_INPUT_INVALID');
  }
  return rubles.format(kopecks / 100).replace(/\u00a0/gu, ' ');
}

function dimensions(item: WhatsAppHandoffItem): string {
  return item.widthMm === null || item.heightMm === null
    ? 'размер уточнит менеджер'
    : `${item.widthMm}×${item.heightMm} мм`;
}

function summaryLine(input: WhatsAppHandoffInput): string {
  if (input.pricingStatus === 'PRICE_ON_REQUEST') return 'Стоимость уточнит менеджер.';
  const known = formatMoney(input.knownSubtotalKopecks);
  return input.pricingStatus === 'PARTIALLY_PRICED'
    ? `Известная предварительная сумма: ${known}. Часть стоимости уточнит менеджер.`
    : `Предварительная сумма: ${known}.`;
}

export function createWhatsAppHandoff(input: WhatsAppHandoffInput): WhatsAppHandoff {
  if (
    !/^REQ-[0-9]{6}-[A-Z2-9]{8}$/u.test(input.requestNumber) ||
    input.items.length === 0 ||
    input.items.length > 50 ||
    !Number.isSafeInteger(input.totalQuantity) ||
    input.totalQuantity <= 0 ||
    !Number.isSafeInteger(input.unknownItemCount) ||
    input.unknownItemCount < 0
  ) {
    throw new TypeError('WHATSAPP_MESSAGE_INPUT_INVALID');
  }
  const publicUrl = new URL(input.publicSummaryUrl);
  if (
    !['http:', 'https:'].includes(publicUrl.protocol) ||
    publicUrl.username ||
    publicUrl.password
  ) {
    throw new TypeError('WHATSAPP_MESSAGE_INPUT_INVALID');
  }

  const itemLines = input.items.map((item, index) => {
    const price =
      item.quantityTotalKopecks === null
        ? 'стоимость уточнит менеджер'
        : `предварительно ${formatMoney(item.quantityTotalKopecks)}`;
    return `${index + 1}. ${safeLineValue(item.family)} / ${safeLineValue(item.system)} / ${safeLineValue(item.model)}; ${safeLineValue(item.material)} (${safeLineValue(item.materialArticle, 64)}); ${dimensions(item)}; ${item.quantity} шт.; ${price}.`;
  });
  const lines = [
    'Здравствуйте! Хочу уточнить заявку.',
    `Номер заявки: ${input.requestNumber}`,
    `Изделий: ${input.totalQuantity} шт.`,
    ...itemLines,
    summaryLine(input),
    ...(input.unknownItemCount > 0
      ? [`Позиций с ручным расчётом: ${input.unknownItemCount}.`]
      : []),
    input.measurementRequested ? 'Нужен бесплатный замер.' : 'Бесплатный замер пока не запрошен.',
    ...(input.installmentInterest ? ['Интересуют условия рассрочки — уточню их у менеджера.'] : []),
    `Населённый пункт: ${safeLineValue(input.locality, 160)}.`,
    `Безопасное резюме заявки: ${publicUrl.toString()}`,
  ];
  const message = lines.join('\n');
  const url = new URL(`https://wa.me/${businessWhatsAppRecipient}`);
  url.searchParams.set('text', message);
  return { message, recipient: businessWhatsAppRecipient, whatsappUrl: url.toString() };
}
