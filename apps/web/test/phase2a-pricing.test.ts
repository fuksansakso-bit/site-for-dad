import { describe, expect, it } from 'vitest';

import { formatMoney } from '../lib/phase2a/pricing';
import {
  presentAmigoMappingStatus,
  presentPricingMode,
  resolvePublicSiteName,
} from '../lib/presentation';

describe('Phase 2C exact AMIGO pricing boundary', () => {
  it('formats server-confirmed kopecks without a local minimum', () => {
    expect(formatMoney(25_000)).toContain('250');
  });

  it('does not expose the retired local area-price calculator', async () => {
    const pricing = await import('../lib/phase2a/pricing');
    expect(pricing).not.toHaveProperty('calculateUnitPrice');
    expect(pricing).not.toHaveProperty('MINIMUM_UNIT_KOPECKS');
    expect(pricing).not.toHaveProperty('priceItem');
  });

  it('keeps public and staff presentation labels human-readable', () => {
    expect(resolvePublicSiteName('PROJECT_NAME')).toBe('Жалюзи на заказ');
    expect(presentPricingMode('AMIGO_EXACT')).toBe('Точная цена AMIGO');
    expect(presentAmigoMappingStatus('READY')).toBe('Готов к точному расчёту');
    expect(presentAmigoMappingStatus('MISSING_CURRENT_FROM_PRICE')).not.toContain('_');
  });
});
