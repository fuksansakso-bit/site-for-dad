import pg from 'pg';

import { resolveSupabaseDatabaseUrl } from './supabase-db.mjs';

const { connectionString } = resolveSupabaseDatabaseUrl();
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 30_000,
});
await client.connect();
try {
  const catalog = await client.query(
    `select m.id,m.slug,m.name,m.amigo_price_version,m.amigo_calculator_model_id,m.amigo_calculator_material_id,
      (select count(*)::int from public.public_materials where category_slug='amigo-category-rulonnye-shtory-zebra') as zebra_count,
      (select count(*)::int from public.public_categories) as category_count
     from public.materials m
     where m.slug='amigo-material-12114' and m.is_published and m.pricing_mode='AMIGO_EXACT'
     limit 1`,
  );
  if (catalog.rowCount !== 1 || catalog.rows[0].zebra_count < 100) {
    throw new Error('Zebra public projection is incomplete');
  }
  const material = catalog.rows[0];
  const cache = await client.query(
    `select unit_price_kopecks from public.amigo_calculation_cache
     where source_version=$1 and calculator_model_id=$2 and calculator_material_id=$3
       and width_mm=1000 and height_mm=1000`,
    [
      material.amigo_price_version,
      material.amigo_calculator_model_id,
      material.amigo_calculator_material_id,
    ],
  );
  if (cache.rowCount !== 1 || Number(cache.rows[0].unit_price_kopecks) <= 0) {
    throw new Error('Exact AMIGO cache fact is missing');
  }
  const unit = Number(cache.rows[0].unit_price_kopecks);
  await client.query('begin');
  try {
    const payload = {
      customerName: 'Runtime QA',
      customerPhone: '+79990000000',
      locality: 'Грозный',
      items: [
        {
          calculatorMaterialId: material.amigo_calculator_material_id,
          calculatorModelId: material.amigo_calculator_model_id,
          heightMm: 1000,
          materialSlug: material.slug,
          priceSourceVersion: material.amigo_price_version,
          quantity: 1,
          unitPriceKopecks: unit,
          widthMm: 1000,
        },
      ],
    };
    const order = await client.query(
      'select public.create_order_from_server($1::jsonb) as result',
      [payload],
    );
    const result = order.rows[0]?.result;
    if (result?.pricingStatus !== 'KNOWN' || Number(result?.knownTotalKopecks) !== unit) {
      throw new Error('Exact order snapshot was not accepted');
    }
  } finally {
    await client.query('rollback');
  }
  const owner = await client.query(
    `select count(*)::int as count from public.staff_profiles p join auth.users u on u.id=p.auth_user_id
     where lower(u.email)='ramzanbataew86@gmail.com' and p.role='OWNER' and p.is_active`,
  );
  if (owner.rows[0]?.count !== 1) throw new Error('OWNER profile is not ready');
  console.log(
    JSON.stringify(
      {
        categoryCount: material.category_count,
        exactUnitPriceKopecks: unit,
        ownerReady: true,
        orderRollbackVerified: true,
        sourceVersion: material.amigo_price_version,
        zebraCount: material.zebra_count,
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
