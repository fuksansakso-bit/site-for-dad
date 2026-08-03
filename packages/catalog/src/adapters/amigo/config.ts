import { type SourceFamilyReference } from '../../types.js';

export const amigoAdapterVersions = {
  mapping: 'amigo-public-pilot-mapping/1.0.0',
  parser: 'amigo-public-html/1.0.0',
} as const;

export const amigoOrigin = 'https://shop.amigo.ru';
export const amigoPilotCatalogSourceId = '00000000-0000-4000-8000-000000000103';

export interface AmigoPilotCategoryConfig {
  readonly categoryName: string;
  readonly categoryPath: string;
  readonly categorySourceId: string;
  readonly family: SourceFamilyReference;
  readonly pilotMaterialSourceIds: readonly string[];
  readonly systemSourceIds: readonly string[];
}

export interface AmigoPilotSystemConfig {
  readonly categorySourceId: string;
  readonly family: SourceFamilyReference;
  readonly pagePath: string;
  readonly sourceId: string;
}

const rollerFamily = {
  code: 'ROLLER',
  name: 'Рулонные шторы',
  slug: 'rulonnye-shtory',
  sourceId: 'family:roller',
} as const;

const zebraFamily = {
  code: 'ZEBRA',
  name: 'Рулонные шторы «Зебра» / «День-Ночь»',
  slug: 'rulonnye-shtory-zebra',
  sourceId: 'family:zebra',
} as const;

const horizontalAluminumFamily = {
  code: 'HORIZONTAL_ALUMINUM',
  name: 'Горизонтальные алюминиевые жалюзи',
  slug: 'gorizontalnye-alyuminievye-zhalyuzi',
  sourceId: 'family:horizontal-aluminum',
} as const;

const verticalFamily = {
  code: 'VERTICAL',
  name: 'Вертикальные жалюзи',
  slug: 'vertikalnye-zhalyuzi',
  sourceId: 'family:vertical',
} as const;

export const amigoPilotCategories: readonly AmigoPilotCategoryConfig[] = [
  {
    categoryName: 'Рулонные ткани',
    categoryPath: '/rulonnye-shtory/rulonnye-tkani/',
    categorySourceId: '80',
    family: rollerFamily,
    pilotMaterialSourceIds: [
      '49126',
      '49124',
      '49122',
      '49120',
      '49119',
      '49117',
      '49129',
      '50772',
    ],
    systemSourceIds: ['7556', '7557'],
  },
  {
    categoryName: 'Ткани «Зебра»',
    categoryPath: '/rulonnye-shtory-zebra/rulonnye-tkani-zebra/',
    categorySourceId: '83',
    family: zebraFamily,
    pilotMaterialSourceIds: [
      '54650',
      '54649',
      '54648',
      '54647',
      '49850',
      '49849',
      '49848',
      '49847',
    ],
    systemSourceIds: ['7542', '7543'],
  },
  {
    categoryName: 'Горизонтальные алюминиевые ленты',
    categoryPath: '/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/',
    categorySourceId: '68',
    family: horizontalAluminumFamily,
    pilotMaterialSourceIds: ['38920', '38919', '38918', '38917', '143', '28076', '28075', '28074'],
    systemSourceIds: [],
  },
  {
    categoryName: 'Вертикальные ткани',
    categoryPath: '/vertikalnye-zhalyuzi/vertikalnye-tkani/',
    categorySourceId: '65',
    family: verticalFamily,
    pilotMaterialSourceIds: ['39807', '39806', '39805', '17603', '1667', '1666', '1665', '1664'],
    systemSourceIds: [],
  },
] as const;

export const amigoPilotSystems: readonly AmigoPilotSystemConfig[] = [
  {
    categorySourceId: '80',
    family: rollerFamily,
    pagePath: '/rulonnye-shtory/',
    sourceId: '7556',
  },
  {
    categorySourceId: '80',
    family: rollerFamily,
    pagePath: '/rulonnye-shtory/',
    sourceId: '7557',
  },
  {
    categorySourceId: '83',
    family: zebraFamily,
    pagePath: '/rulonnye-shtory-zebra/',
    sourceId: '7542',
  },
  {
    categorySourceId: '83',
    family: zebraFamily,
    pagePath: '/rulonnye-shtory-zebra/',
    sourceId: '7543',
  },
] as const;

export const amigoAllowedPagePaths = new Set([
  ...amigoPilotCategories.map((category) => category.categoryPath),
  ...amigoPilotSystems.map((system) => system.pagePath),
]);

export const amigoPilotMaterialCount = amigoPilotCategories.reduce(
  (count, category) => count + category.pilotMaterialSourceIds.length,
  0,
);

export const amigoPilotCategorySourceIds = amigoPilotCategories.map(
  (category) => category.categorySourceId,
);
export const amigoPilotMaterialSourceIds = amigoPilotCategories.flatMap(
  (category) => category.pilotMaterialSourceIds,
);
export const amigoPilotSystemSourceIds = amigoPilotSystems.map((system) => system.sourceId);
