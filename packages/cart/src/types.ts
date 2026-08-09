export const cartItemPricingStatuses = [
  'CALCULATED',
  'SOURCE_DATA_STALE',
  'PRICE_ON_REQUEST',
  'MANUAL_REVIEW_REQUIRED',
] as const;

export type CartItemPricingStatus = (typeof cartItemPricingStatuses)[number];
export type CartPricingStatus = 'FULLY_PRICED' | 'PARTIALLY_PRICED' | 'PRICE_ON_REQUEST';

export interface CartProductSnapshot {
  readonly additionalOptions: readonly string[];
  readonly color: string;
  readonly control: string;
  readonly family: string;
  readonly hardware: string;
  readonly heightMm: number;
  readonly material: string;
  readonly materialArticle: string;
  readonly model: string;
  readonly modelCode: string;
  readonly mounting: string;
  readonly quantity: number;
  readonly system: string;
  readonly widthMm: number;
}

export interface CartQuoteSnapshot {
  readonly catalogVersionId: string;
  readonly createdAt: string;
  readonly grandTotalKopecks: number | null;
  readonly minimumPriceApplied: boolean;
  readonly optionsTotalKopecks: number | null;
  readonly priceVersionId: string | null;
  readonly product: CartProductSnapshot;
  readonly status: CartItemPricingStatus;
  readonly unitFinalPriceKopecks: number | null;
  readonly warnings: readonly string[];
}

export interface CartSummaryItem {
  readonly itemReference: string;
  readonly quote: CartQuoteSnapshot;
}

export interface CartMoneySummary {
  readonly currency: 'RUB';
  readonly deliveryKopecks: 0;
  readonly installationKopecks: 0;
  readonly knownOptionsKopecks: number;
  readonly knownProductsKopecks: number;
  readonly knownSubtotalKopecks: number;
  readonly measurementKopecks: 0;
  readonly minimumAppliedItemCount: number;
  readonly pricingStatus: CartPricingStatus;
  readonly pricedItemCount: number;
  readonly totalItemCount: number;
  readonly totalQuantity: number;
  readonly unknownItemCount: number;
}

export interface CartSummary {
  readonly money: CartMoneySummary;
  readonly priceVersionChangedItemCount: number;
}
