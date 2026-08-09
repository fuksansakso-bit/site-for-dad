import type { PublicRequestSummaryResponse } from '@project-name/contracts/request';
import type { PublicRequestSummaryView } from '@project-name/db';
import { activeSiteSettingsFallback, type SiteSettings } from '@project-name/db';

const statusLabels: Record<PublicRequestSummaryView['status'], string> = {
  CANCELLED: 'Заявка отменена',
  CONFIRMED: 'Заявка подтверждена',
  CONTACTED: 'Менеджер связался',
  IN_REVIEW: 'Заявка на рассмотрении',
  NEW: 'Заявка получена',
};

function pricingLabel(
  status: PublicRequestSummaryView['snapshot']['items'][number]['pricingStatus'],
) {
  if (status === 'MANUAL_REVIEW_REQUIRED') return 'Размер требует проверки' as const;
  if (status === 'PRICE_ON_REQUEST') return 'Стоимость уточнит менеджер' as const;
  return 'Стоимость рассчитана' as const;
}

export function publicRequestSummaryResponse(
  source: PublicRequestSummaryView,
  publicReference: string,
  correlationId: string,
  settings: SiteSettings = activeSiteSettingsFallback,
): PublicRequestSummaryResponse {
  const previewSequences = new Set(source.previewSequences);
  return {
    correlationId,
    createdAt: source.createdAt,
    installmentInterest: source.installmentInterest,
    installmentText: settings.installmentText,
    items: source.snapshot.items.map((item, index) => {
      const sequence = index + 1;
      return {
        minimumPriceApplied: item.minimumPriceApplied,
        optionsTotalKopecks: item.optionsTotalKopecks,
        previewAssetHref: previewSequences.has(sequence)
          ? `/api/v1/requests/public/${publicReference}/items/${sequence}/preview`
          : null,
        pricingLabel: pricingLabel(item.pricingStatus),
        product: {
          ...item.product,
          additionalOptions: [...item.product.additionalOptions],
        },
        quantityTotalKopecks: item.quantityTotalKopecks,
        sequence,
        unitPriceKopecks: item.unitPriceKopecks,
        warnings: [...item.warnings],
      };
    }),
    manufacturingLeadTime: settings.manufacturingLeadTime,
    measurementRequested: source.measurementRequested,
    requestNumber: source.requestNumber,
    services: {
      delivery: settings.services.delivery,
      installation: settings.services.installation,
      measurement: settings.services.measurement,
    },
    statusLabel: statusLabels[source.status] as PublicRequestSummaryResponse['statusLabel'],
    summary: source.snapshot.summary,
    warranty: settings.warranty,
  };
}
