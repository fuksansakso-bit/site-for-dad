import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { parseAmigoMaterialCollectionPage } from '../../packages/catalog/src/adapters/amigo/parser.ts';

const SHOP_ORIGIN = 'https://shop.amigo.ru';
const CALCULATOR_ORIGIN = 'https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru';
const OUTPUT = resolve('tooling/phase2a/generated/amigo-exact-price-version.json');
const LOCAL_MATERIALS = resolve('.local/phase-2a-migration/transform/materials.json');

const collections = [
  { path: '/vertikalnye-zhalyuzi/vertikalnye-tkani/', models: [43] },
  { path: '/vertikalnye-zhalyuzi/vertikalnyy-plastik-alyuminiy/', models: [44, 45] },
  { path: '/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/', models: [22, 28, 29] },
  { path: '/gorizontalnye-derevyannye-zhalyuzi/bambuk-derevo-plastik/', models: [39, 40] },
  { path: '/rulonnye-shtory/rulonnye-tkani/', models: [1] },
  { path: '/rulonnye-shtory-zebra/rulonnye-tkani-zebra/', models: [6] },
  { path: '/shtory-plisse/tkani-plisse/', models: [52] },
  { path: '/shtory-mirazh/tkani-mirazh/', models: [11] },
  { path: '/rimskie-shtory/porternye-tkani/', models: [296] },
] as const;

type LocalMaterial = {
  article: string;
  legacySourceId: string;
  name: string;
  primaryMedia: { publicationStatus?: string; rightsStatus?: string } | null;
  slug: string;
  sourceUrl: string;
};

type CalculatorMaterial = {
  id: number;
  name: string;
  vendor_code: string;
  material_collection?: {
    name?: string;
    roller_width?: number | string | null;
    line_width?: number | string | null;
  } | null;
};

type CalculatorWrapper = { material: CalculatorMaterial };

const sleep = (milliseconds: number) => new Promise((accept) => setTimeout(accept, milliseconds));

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleUpperCase('ru-RU')
    .replaceAll('Ё', 'Е')
    .replace(
      /\b(?:ЗЕБРА|ТКАНЬ|ТКАНИ|РУЛОННАЯ|РУЛОННЫЕ|ВЕРТИКАЛЬНАЯ|ВЕРТИКАЛЬНЫЕ|ГОРИЗОНТАЛЬНАЯ|ГОРИЗОНТАЛЬНЫЕ|ПОРТЬЕРНАЯ|ПОРТЬЕРНЫЕ|ПЛИССЕ|МИРАЖ)\b/gu,
      ' ',
    )
    .replace(/[^0-9A-ZА-Я]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function sourceId(value: LocalMaterial): string {
  return value.legacySourceId.split(':').at(-1) ?? '';
}

function sourcePath(value: LocalMaterial): string {
  return new URL(value.sourceUrl).pathname;
}

async function fetchText(url: URL): Promise<string> {
  if (url.origin !== SHOP_ORIGIN || !collections.some((item) => item.path === url.pathname)) {
    throw new Error(`Shop URL is outside the fixed allowlist: ${url.href}`);
  }
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'user-agent': 'PROJECT_NAME authorized partner price verifier/1.0' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return response.text();
    if (attempt === 3 || (response.status < 500 && response.status !== 429)) {
      throw new Error(`AMIGO shop returned HTTP ${response.status}`);
    }
    await sleep(attempt * 900);
  }
  throw new Error('AMIGO shop request exhausted retries.');
}

async function fetchJson<T>(path: string): Promise<T> {
  if (!/^\/api\/models\/[0-9]+\/materials$/u.test(path)) {
    throw new Error(`Calculator path is outside the fixed allowlist: ${path}`);
  }
  const url = new URL(path, CALCULATOR_ORIGIN);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return (await response.json()) as T;
      if (attempt === 3 || (response.status < 500 && response.status !== 429)) {
        throw new Error(`AMIGO calculator returned HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(attempt * 900);
  }
  throw new Error('AMIGO calculator request exhausted retries.');
}

function modelCandidates(
  path: string,
  title: string,
  configured: readonly number[],
): readonly number[] {
  const normalized = normalize(title);
  if (path.includes('gorizontalnye-lenty')) {
    if (/(?:^| )16(?: |$)/u.test(normalized)) return [22];
    if (/(?:^| )50(?: |$)/u.test(normalized)) return [29];
    return [28];
  }
  if (path.includes('bambuk-derevo-plastik')) {
    if (/(?:^| )(?:50|2)(?: |$)/u.test(normalized)) return [40];
    return [39];
  }
  if (path.includes('plastik-alyuminiy')) {
    return /АЛЮМИН/u.test(normalized) ? [45] : [44];
  }
  return configured;
}

function calculatorArticle(material: CalculatorMaterial): string {
  return material.vendor_code.split('-').at(-1)?.trim() ?? '';
}

function widthMm(material: CalculatorMaterial): number | null {
  const raw = material.material_collection?.roller_width;
  if (raw === null || raw === undefined || raw === '') return null;
  const centimeters = Number(String(raw).replace(',', '.'));
  return Number.isFinite(centimeters) && centimeters > 0 ? Math.round(centimeters * 10) : null;
}

function collectionMatches(cardName: string, candidate: CalculatorMaterial): boolean {
  const card = normalize(cardName);
  const collection = normalize(candidate.material_collection?.name ?? '')
    .replace(/(?:^| )[0-9]+(?: [0-9]+)?(?:СМ|ММ|CM|MM)(?: |$)/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!card || !collection) return false;
  return card === collection || card.endsWith(` ${collection}`) || collection.endsWith(` ${card}`);
}

async function main() {
  const locals = JSON.parse(await readFile(LOCAL_MATERIALS, 'utf8')) as LocalMaterial[];
  const retainedByPath = new Map<string, Map<string, LocalMaterial>>();
  for (const local of locals) {
    const path = sourcePath(local);
    const retained = retainedByPath.get(path) ?? new Map<string, LocalMaterial>();
    retained.set(sourceId(local), local);
    retainedByPath.set(path, retained);
  }

  const modelIds = [...new Set(collections.flatMap((item) => [...item.models]))];
  const calculatorByModel = new Map<number, CalculatorMaterial[]>();
  for (const modelId of modelIds) {
    const wrappers = await fetchJson<CalculatorWrapper[]>(`/api/models/${modelId}/materials`);
    calculatorByModel.set(
      modelId,
      wrappers.map((item) => item.material),
    );
    await sleep(120);
  }

  const capturedAt = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  const ignoredSourceIds: string[] = [];
  for (const collection of collections) {
    const firstUrl = new URL(collection.path, SHOP_ORIGIN);
    const first = parseAmigoMaterialCollectionPage(await fetchText(firstUrl), firstUrl.href);
    const pages = [first];
    for (const reference of first.pagination.pageReferences) {
      await sleep(400);
      const url = new URL(reference, SHOP_ORIGIN);
      pages.push(parseAmigoMaterialCollectionPage(await fetchText(url), url.href));
    }
    const retained = retainedByPath.get(collection.path) ?? new Map<string, LocalMaterial>();
    for (const card of pages.flatMap((page) => [...page.materials])) {
      const local = retained.get(card.sourceId);
      if (!local) {
        ignoredSourceIds.push(`${collection.path}#${card.sourceId}`);
        continue;
      }
      const models = modelCandidates(collection.path, card.title, collection.models);
      const articleCandidates = models.flatMap((modelId) =>
        (calculatorByModel.get(modelId) ?? [])
          .filter((candidate) => calculatorArticle(candidate) === card.article)
          .filter((candidate) => {
            const calculatorWidth = widthMm(candidate);
            return (
              card.widthMm === undefined ||
              calculatorWidth === null ||
              calculatorWidth === card.widthMm
            );
          })
          .map((candidate) => ({ candidate, modelId })),
      );
      const uniqueArticle = new Map(
        articleCandidates.map((item) => [`${item.modelId}:${item.candidate.id}`, item]),
      );
      const uniqueNamed = new Map(
        articleCandidates
          .filter((item) => collectionMatches(card.materialName, item.candidate))
          .map((item) => [`${item.modelId}:${item.candidate.id}`, item]),
      );
      const eligible = uniqueNamed.size > 0 ? uniqueNamed : uniqueArticle;
      const match = eligible.size === 1 ? [...eligible.values()][0] : undefined;
      const imageApproved =
        local.primaryMedia?.publicationStatus === 'PUBLICATION_APPROVED' &&
        local.primaryMedia?.rightsStatus === 'PARTNER_LICENSE';
      const mappingStatus =
        card.priceMinor === null
          ? 'MISSING_CURRENT_FROM_PRICE'
          : !imageApproved
            ? 'MISSING_APPROVED_IMAGE'
            : match
              ? 'READY'
              : eligible.size === 0
                ? 'NO_CALCULATOR_MATCH'
                : 'AMBIGUOUS_CALCULATOR_MATCH';
      rows.push({
        calculatorMaterialId: match?.candidate.id ?? null,
        calculatorMaterialName: match?.candidate.name ?? null,
        calculatorModelId: match?.modelId ?? null,
        calculatorVendorCode: match?.candidate.vendor_code ?? null,
        cardArticle: card.article,
        cardName: card.materialName,
        cardSourceId: card.sourceId,
        cardSourceUrl: `${SHOP_ORIGIN}${collection.path}#material-${card.sourceId}`,
        cardWidthMm: card.widthMm ?? null,
        fromPriceKopecks: card.priceMinor,
        fromPriceLabel: card.priceLabel ?? null,
        localMaterialName: local.name,
        localMaterialSlug: local.slug,
        mappingStatus,
        sourceCollectionPath: collection.path,
      });
    }
    await sleep(450);
  }

  rows.sort((left, right) =>
    String(left.localMaterialSlug).localeCompare(String(right.localMaterialSlug)),
  );
  const semantic = { calculatorOrigin: CALCULATOR_ORIGIN, rows, shopOrigin: SHOP_ORIGIN };
  const semanticSha256 = createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
  const version = `amigo-${semanticSha256.slice(0, 16)}`;
  const ready = rows.filter((row) => row.mappingStatus === 'READY').length;
  const artifact = {
    capturedAt,
    calculatorOrigin: CALCULATOR_ORIGIN,
    ignoredLiveSourceCount: ignoredSourceIds.length,
    ignoredLiveSourceIds: ignoredSourceIds.sort(),
    readyCount: ready,
    rowCount: rows.length,
    rows,
    semanticSha256,
    shopOrigin: SHOP_ORIGIN,
    sourceVersion: version,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  const statusCounts = Object.groupBy(rows, (row) => String(row.mappingStatus));
  console.log(
    JSON.stringify(
      {
        sourceVersion: version,
        rowCount: rows.length,
        readyCount: ready,
        statusCounts: Object.fromEntries(
          Object.entries(statusCounts).map(([key, value]) => [key, value?.length ?? 0]),
        ),
        ignoredLiveSourceCount: ignoredSourceIds.length,
      },
      null,
      2,
    ),
  );
}

await main();
