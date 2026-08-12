export const configuratorCoverageStatuses = [
  'AUTOMATIC',
  'MANUAL',
  'UNMAPPED',
  'INCOMPATIBLE',
  'HIDDEN',
  'UNPUBLISHED',
] as const;

export type ConfiguratorCoverageStatus = (typeof configuratorCoverageStatuses)[number];

export interface ConfiguratorCoverageEvidence {
  readonly automaticPricing: boolean;
  readonly compatibleWithSelectedSystem: boolean;
  readonly hasAnyCompatibleSystem: boolean;
  readonly hidden: boolean;
  readonly manualPricingForced?: boolean;
  readonly published: boolean;
}

export function classifyConfiguratorCoverage(
  evidence: ConfiguratorCoverageEvidence,
): ConfiguratorCoverageStatus {
  if (!evidence.published) return 'UNPUBLISHED';
  if (evidence.hidden) return 'HIDDEN';
  if (!evidence.hasAnyCompatibleSystem) return 'UNMAPPED';
  if (!evidence.compatibleWithSelectedSystem) return 'INCOMPATIBLE';
  if (evidence.manualPricingForced === true) return 'MANUAL';
  return evidence.automaticPricing ? 'AUTOMATIC' : 'MANUAL';
}

export function configuratorCoverageSelectable(status: ConfiguratorCoverageStatus): boolean {
  return status === 'AUTOMATIC' || status === 'MANUAL';
}
