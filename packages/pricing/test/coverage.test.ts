import { describe, expect, it } from 'vitest';

import { classifyConfiguratorCoverage, configuratorCoverageSelectable } from '../src/coverage.js';

describe('configurator material coverage', () => {
  it.each([
    [
      {
        published: false,
        hidden: false,
        hasAnyCompatibleSystem: false,
        compatibleWithSelectedSystem: false,
        automaticPricing: false,
      },
      'UNPUBLISHED',
    ],
    [
      {
        published: true,
        hidden: true,
        hasAnyCompatibleSystem: true,
        compatibleWithSelectedSystem: true,
        automaticPricing: true,
      },
      'HIDDEN',
    ],
    [
      {
        published: true,
        hidden: false,
        hasAnyCompatibleSystem: false,
        compatibleWithSelectedSystem: false,
        automaticPricing: false,
      },
      'UNMAPPED',
    ],
    [
      {
        published: true,
        hidden: false,
        hasAnyCompatibleSystem: true,
        compatibleWithSelectedSystem: false,
        automaticPricing: true,
      },
      'INCOMPATIBLE',
    ],
    [
      {
        published: true,
        hidden: false,
        hasAnyCompatibleSystem: true,
        compatibleWithSelectedSystem: true,
        automaticPricing: true,
      },
      'AUTOMATIC',
    ],
    [
      {
        published: true,
        hidden: false,
        hasAnyCompatibleSystem: true,
        compatibleWithSelectedSystem: true,
        automaticPricing: false,
      },
      'MANUAL',
    ],
    [
      {
        published: true,
        hidden: false,
        hasAnyCompatibleSystem: true,
        compatibleWithSelectedSystem: true,
        automaticPricing: true,
        manualPricingForced: true,
      },
      'MANUAL',
    ],
  ] as const)('applies precedence to %j', (evidence, expected) => {
    expect(classifyConfiguratorCoverage(evidence)).toBe(expected);
  });

  it('allows only automatic and honest manual selections', () => {
    expect(configuratorCoverageSelectable('AUTOMATIC')).toBe(true);
    expect(configuratorCoverageSelectable('MANUAL')).toBe(true);
    expect(configuratorCoverageSelectable('UNMAPPED')).toBe(false);
    expect(configuratorCoverageSelectable('INCOMPATIBLE')).toBe(false);
  });
});
