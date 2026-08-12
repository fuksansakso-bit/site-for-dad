import { readFile } from 'node:fs/promises';

import pg from 'pg';

import { resolveSupabaseDatabaseUrl } from './supabase-db.mjs';

const artifact = JSON.parse(
  await readFile('tooling/phase2a/generated/amigo-exact-price-version.json', 'utf8'),
);
const migrations = [
  'supabase/migrations/20260813120000_add_amigo_exact_pricing_mode.sql',
  'supabase/migrations/20260813120100_amigo_exact_pricing.sql',
  'supabase/migrations/20260813120200_harden_amigo_price_version_immutability.sql',
];
const groupByPath = {
  '/vertikalnye-zhalyuzi/vertikalnye-tkani/': [
    'amigo-category-vertikalnye-zhalyuzi',
    'Вертикальные жалюзи',
  ],
  '/vertikalnye-zhalyuzi/vertikalnyy-plastik-alyuminiy/': [
    'amigo-category-vertikalnye-zhalyuzi',
    'Вертикальные жалюзи',
  ],
  '/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/': [
    'amigo-category-gorizontalnye-alyuminievye-zhalyuzi',
    'Горизонтальные алюминиевые',
  ],
  '/gorizontalnye-derevyannye-zhalyuzi/bambuk-derevo-plastik/': [
    'amigo-category-gorizontalnye-derevyannye-zhalyuzi',
    'Деревянные и бамбуковые',
  ],
  '/rulonnye-shtory/rulonnye-tkani/': ['amigo-category-rulonnye-shtory', 'Рулонные шторы'],
  '/rulonnye-shtory-zebra/rulonnye-tkani-zebra/': [
    'amigo-category-rulonnye-shtory-zebra',
    'День-ночь / Зебра',
  ],
  '/shtory-plisse/tkani-plisse/': ['amigo-category-shtory-plisse', 'Шторы плиссе'],
  '/shtory-mirazh/tkani-mirazh/': ['amigo-category-shtory-mirazh', 'Шторы Мираж'],
  '/rimskie-shtory/porternye-tkani/': ['amigo-category-rimskie-shtory', 'Римские шторы'],
};

for (const row of artifact.rows) {
  const group = groupByPath[row.sourceCollectionPath];
  if (!group) throw new Error(`No public group for ${row.sourceCollectionPath}`);
  row.catalogGroupSlug = group[0];
  row.catalogGroupName = group[1];
}

const { connectionString } = resolveSupabaseDatabaseUrl();
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 60_000,
});
await client.connect();
try {
  for (const migration of migrations) {
    const isEnumMigration = migration.includes('add_amigo_exact_pricing_mode');
    const isHardeningMigration = migration.includes('harden_amigo_price_version_immutability');
    const exists = isEnumMigration
      ? await client.query(
          "select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='pricing_mode' and e.enumlabel='AMIGO_EXACT'",
        )
      : isHardeningMigration
        ? { rowCount: 0 }
        : await client.query(
            "select 1 where to_regclass('public.amigo_price_versions') is not null",
          );
    if (exists.rowCount) continue;
    const sql = await readFile(migration, 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  await client.query('begin');
  try {
    await client.query('update public.amigo_price_versions set is_active=false where is_active');
    await client.query(
      `insert into public.amigo_price_versions(source_version,semantic_sha256,shop_origin,calculator_origin,captured_at,is_active,ready_count,row_count)
       values($1,$2,$3,$4,$5,true,$6,$7)
       on conflict(source_version) do update set is_active=true`,
      [
        artifact.sourceVersion,
        artifact.semanticSha256,
        artifact.shopOrigin,
        artifact.calculatorOrigin,
        artifact.capturedAt,
        artifact.readyCount,
        artifact.rowCount,
      ],
    );
    await client.query(
      `with incoming as (
        select * from jsonb_to_recordset($1::jsonb) as x(
          "localMaterialSlug" text,"fromPriceKopecks" integer,"fromPriceLabel" text,
          "cardSourceId" text,"calculatorModelId" integer,"calculatorMaterialId" integer,
          "calculatorMaterialName" text,"calculatorVendorCode" text,"mappingStatus" text,
          "catalogGroupSlug" text,"catalogGroupName" text)
      )
      update public.materials m set
        price_per_m2_kopecks=null,fixed_price_kopecks=null,minimum_price_kopecks=null,
        pricing_mode=case when i."mappingStatus"='READY' then 'AMIGO_EXACT'::public.pricing_mode else 'MANUAL'::public.pricing_mode end,
        is_published=(i."mappingStatus"='READY'),
        amigo_from_price_kopecks=case when i."mappingStatus"='READY' then i."fromPriceKopecks" else null end,
        amigo_from_price_label=case when i."mappingStatus"='READY' then i."fromPriceLabel" else null end,
        amigo_price_version=case when i."mappingStatus"='READY' then $2 else null end,
        amigo_price_captured_at=case when i."mappingStatus"='READY' then $3::timestamptz else null end,
        amigo_card_source_id=i."cardSourceId",amigo_calculator_origin=case when i."mappingStatus"='READY' then $4 else null end,
        amigo_calculator_model_id=i."calculatorModelId",amigo_calculator_material_id=i."calculatorMaterialId",
        amigo_calculator_material_name=i."calculatorMaterialName",amigo_calculator_vendor_code=i."calculatorVendorCode",
        amigo_mapping_status=i."mappingStatus",catalog_group_slug=i."catalogGroupSlug",catalog_group_name=i."catalogGroupName"
      from incoming i where m.slug=i."localMaterialSlug"`,
      [
        JSON.stringify(artifact.rows),
        artifact.sourceVersion,
        artifact.capturedAt,
        artifact.calculatorOrigin,
      ],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  const result = await client.query(
    `select (select count(*) from public.public_materials) as materials,(select count(*) from public.public_categories) as categories`,
  );
  console.log(
    JSON.stringify({ sourceVersion: artifact.sourceVersion, ...result.rows[0] }, null, 2),
  );
} finally {
  await client.end();
}
