import type { CartMoneySummary, CartQuoteSnapshot, CartSummary, CartSummaryItem } from './types.js';

function addMoney(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0) {
    throw new RangeError('CART_MONEY_INVALID');
  }
  const result = BigInt(left) + BigInt(right);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('CART_MONEY_OVERFLOW');
  return Number(result);
}

function multiplyMoney(amount: number, quantity: number): number {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(quantity) ||
    amount < 0 ||
    quantity <= 0
  ) {
    throw new RangeError('CART_MONEY_INVALID');
  }
  const result = BigInt(amount) * BigInt(quantity);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('CART_MONEY_OVERFLOW');
  return Number(result);
}

function assertQuote(quote: CartQuoteSnapshot): void {
  if (!Number.isSafeInteger(quote.product.quantity) || quote.product.quantity <= 0) {
    throw new RangeError('CART_QUANTITY_INVALID');
  }
  const priced = quote.status === 'CALCULATED' || quote.status === 'SOURCE_DATA_STALE';
  if (priced !== (quote.grandTotalKopecks !== null && quote.unitFinalPriceKopecks !== null)) {
    throw new RangeError('CART_PRICE_STATUS_INCONSISTENT');
  }
  if (
    quote.grandTotalKopecks !== null &&
    (!Number.isSafeInteger(quote.grandTotalKopecks) || quote.grandTotalKopecks < 0)
  ) {
    throw new RangeError('CART_MONEY_INVALID');
  }
  if (
    quote.optionsTotalKopecks !== null &&
    (!Number.isSafeInteger(quote.optionsTotalKopecks) || quote.optionsTotalKopecks < 0)
  ) {
    throw new RangeError('CART_MONEY_INVALID');
  }
}

export function summarizeCart(
  items: readonly CartSummaryItem[],
  activePriceVersionId: string | null,
): CartSummary {
  let knownOptionsKopecks = 0;
  let knownProductsKopecks = 0;
  let knownSubtotalKopecks = 0;
  let minimumAppliedItemCount = 0;
  let priceVersionChangedItemCount = 0;
  let pricedItemCount = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const quote = item.quote;
    assertQuote(quote);
    totalQuantity = addMoney(totalQuantity, quote.product.quantity);
    if (quote.priceVersionId !== null && quote.priceVersionId !== activePriceVersionId) {
      priceVersionChangedItemCount += 1;
    }
    if (quote.grandTotalKopecks === null) continue;
    pricedItemCount += 1;
    if (quote.minimumPriceApplied) minimumAppliedItemCount += 1;
    const optionUnit = quote.optionsTotalKopecks ?? 0;
    const itemOptions = multiplyMoney(optionUnit, quote.product.quantity);
    if (itemOptions > quote.grandTotalKopecks) throw new RangeError('CART_BREAKDOWN_INVALID');
    knownOptionsKopecks = addMoney(knownOptionsKopecks, itemOptions);
    knownProductsKopecks = addMoney(knownProductsKopecks, quote.grandTotalKopecks - itemOptions);
    knownSubtotalKopecks = addMoney(knownSubtotalKopecks, quote.grandTotalKopecks);
  }

  const unknownItemCount = items.length - pricedItemCount;
  const money: CartMoneySummary = {
    currency: 'RUB',
    deliveryKopecks: 0,
    installationKopecks: 0,
    knownOptionsKopecks,
    knownProductsKopecks,
    knownSubtotalKopecks,
    measurementKopecks: 0,
    minimumAppliedItemCount,
    pricingStatus:
      pricedItemCount === items.length
        ? 'FULLY_PRICED'
        : pricedItemCount === 0
          ? 'PRICE_ON_REQUEST'
          : 'PARTIALLY_PRICED',
    pricedItemCount,
    totalItemCount: items.length,
    totalQuantity,
    unknownItemCount,
  };
  return { money, priceVersionChangedItemCount };
}
