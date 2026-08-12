import type { CartItemPricingStatus, CartPricingStatus } from './types.js';

export function cartItemStatusLabel(status: CartItemPricingStatus): string {
  switch (status) {
    case 'CALCULATED':
    case 'SOURCE_DATA_STALE':
      return 'Стоимость рассчитана';
    case 'PRICE_ON_REQUEST':
      return 'Стоимость уточнит менеджер';
    case 'MANUAL_REVIEW_REQUIRED':
      return 'Размер требует проверки';
  }
}

export function cartPricingStatusLabel(status: CartPricingStatus): string {
  switch (status) {
    case 'FULLY_PRICED':
      return 'Предварительная стоимость рассчитана';
    case 'PARTIALLY_PRICED':
      return 'Часть суммы требует уточнения';
    case 'PRICE_ON_REQUEST':
      return 'Стоимость уточнит менеджер';
  }
}
