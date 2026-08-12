import {
  configuratorMaterialSearchResponseSchema,
  type ConfiguratorMaterialSearchResponse,
} from '@project-name/contracts';
import { configuratorCoverageSelectable } from '@project-name/pricing';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebPricing } from '../../../../../lib/catalog-runtime';
import {
  decodeConfiguratorMaterialCursor,
  encodeConfiguratorMaterialCursor,
  parseConfiguratorMaterialQuery,
} from '../../../../../lib/configurator-materials';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { pricingRouteErrorCode } from '../../../../../lib/pricing-route';
import {
  PricingRequestError,
  pricingNoStoreHeaders,
  pricingSafeFailure,
} from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

const availabilityLabels = {
  INQUIRY_ONLY: 'Уточнить наличие',
  IN_STOCK: 'В наличии',
  OUT_OF_STOCK: 'Временно нет в наличии',
} as const;

function calculationLabel(status: string): string {
  if (status === 'AUTOMATIC') return 'Стоимость рассчитывается автоматически';
  if (status === 'MANUAL') return 'Стоимость этого материала уточнит менеджер';
  if (status === 'INCOMPATIBLE') return 'Не подходит к выбранной системе';
  return 'Материал пока недоступен для выбора';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const query = parseConfiguratorMaterialQuery(request.nextUrl.searchParams);
    const cursor = decodeConfiguratorMaterialCursor(query, signingKey);
    const page = await getWebPricing().searchMaterials({
      categoryId: query.category,
      familyId: query.family,
      limit: query.limit,
      offset: cursor.offset,
      query: query.q,
      ...(query.selected === undefined ? {} : { selectedMaterialId: query.selected }),
      systemId: query.system,
    });
    if (cursor.catalogVersionId !== null && cursor.catalogVersionId !== page.catalogVersionId) {
      throw new PricingRequestError('VALIDATION_ERROR');
    }
    const nextOffset = cursor.offset + page.items.length;
    const body: ConfiguratorMaterialSearchResponse = configuratorMaterialSearchResponseSchema.parse(
      {
        correlationId: context.correlationId,
        items: page.items.map((item) => {
          const coverageSelectable = configuratorCoverageSelectable(item.coverageStatus);
          const selectable = coverageSelectable && item.availability !== 'OUT_OF_STOCK';
          return {
            article: item.article,
            availabilityLabel: availabilityLabels[item.availability],
            calculationLabel: calculationLabel(item.coverageStatus),
            category: item.categoryName,
            color: item.color,
            id: item.id,
            image:
              item.image === null
                ? null
                : {
                    height: item.image.height,
                    url: `/api/v1/catalog/media/${item.image.id}?v=${page.catalogVersionId}`,
                    width: item.image.width,
                  },
            name: item.name,
            pricing:
              item.coverageStatus === 'AUTOMATIC'
                ? 'AUTOMATIC'
                : item.coverageStatus === 'MANUAL'
                  ? 'MANUAL'
                  : 'UNAVAILABLE',
            selectable,
            system: item.systemName,
          };
        }),
        nextCursor:
          nextOffset < page.total
            ? encodeConfiguratorMaterialCursor(query, page.catalogVersionId, nextOffset, signingKey)
            : null,
        total: page.total,
      },
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
