import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(
  new URL(
    '../../../supabase/migrations/20260812115907_phase_2a_simplified_schema.sql',
    import.meta.url,
  ),
  'utf8',
);

const exposedTables = [
  'staff_profiles',
  'categories',
  'materials',
  'pricing_rules',
  'orders',
  'order_items',
  'portfolio_items',
  'site_settings',
  'admin_audit_log',
  'migration_runs',
];

test('all exposed tables explicitly enable RLS', () => {
  for (const table of exposedTables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
});

test('anonymous users have no direct order writes', () => {
  assert.doesNotMatch(sql, /grant\s+insert\s+on\s+public\.orders\s+to\s+anon/i);
  assert.doesNotMatch(sql, /create policy[^;]+on public\.orders[^;]+to anon[^;]+for insert/is);
});

test('anonymous catalog access uses safe views rather than source tables', () => {
  assert.match(sql, /create view public\.public_materials/i);
  assert.match(
    sql,
    /grant select on public\.public_categories, public\.public_materials,[^;]+to anon/i,
  );
  assert.doesNotMatch(sql, /grant select on public\.categories[^;]+to anon/i);
  assert.doesNotMatch(sql, /grant select on public\.materials[^;]+to anon/i);
});

test('service-only import cannot be called by browser roles', () => {
  assert.match(
    sql,
    /revoke all on function public\.phase2a_import\([^;]+from public, anon, authenticated/i,
  );
  assert.match(sql, /grant execute on function public\.phase2a_import\([^;]+to service_role/i);
});

test('order creation is service-only and recalculates from stored material pricing', () => {
  assert.match(
    sql,
    /revoke all on function public\.create_order_from_server\(jsonb\) from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.create_order_from_server\(jsonb\) to service_role/i,
  );
  assert.match(sql, /v_material\.price_per_m2_kopecks/i);
  assert.doesNotMatch(sql, /v_item->>'(?:unitPriceKopecks|totalPriceKopecks)'/i);
});

test('pricing has explicit fixed field and MANUAL null shape', () => {
  assert.match(sql, /fixed_price_kopecks integer/i);
  assert.match(
    sql,
    /pricing_mode = 'MANUAL'[^;]+price_per_m2_kopecks is null[^;]+fixed_price_kopecks is null[^;]+minimum_price_kopecks is null/is,
  );
});

test('staff role is read from active database profile, not metadata', () => {
  assert.match(
    sql,
    /from public\.staff_profiles sp[^$]+sp\.auth_user_id = \(select auth\.uid\(\)\)[^$]+sp\.is_active/is,
  );
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/i);
});

test('storage policies are bucket scoped', () => {
  for (const bucket of ['catalog', 'portfolio', 'branding'])
    assert.match(sql, new RegExp(`'${bucket}'`));
  assert.match(sql, /create policy storage_staff_insert on storage\.objects/i);
});
