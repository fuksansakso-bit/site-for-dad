import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const forbiddenPathSegments = new Set([
  'ai',
  'calculator',
  'cart',
  'checkout',
  'configurator',
  'installment',
  'orders',
  'photos',
  'preview',
  'starfield',
  'uploads',
  'visualizer',
  'whatsapp',
]);
const allowedPrismaModels = new Set([
  'ActorIdentity',
  'AuditEvent',
  'IdempotencyRecord',
  'OutboxEvent',
  'RoleGrant',
  'ServiceHeartbeat',
  'SyntheticSession',
  'Supplier',
  'SupplierRelationship',
  'CatalogSource',
  'SourceSnapshot',
  'SourceEntity',
  'CatalogSyncRun',
  'CatalogSyncItem',
  'CatalogSyncDifference',
  'CatalogVersion',
  'ProductFamily',
  'ProductCategory',
  'ProductSystem',
  'ProductModel',
  'Material',
  'Color',
  'MaterialVariant',
  'MaterialProperty',
  'MediaAsset',
  'SourceMediaAsset',
  'MaterialMediaAsset',
  'CompatibilityRule',
  'DimensionConstraint',
  'SourcePriceRecord',
  'PriceVersion',
  'PriceVersionRecord',
  'BusinessCatalogEntry',
  'AvailabilityRecord',
  'LocalPriceOverride',
  'PublicationRecord',
  'CatalogVersionEntry',
]);
const allowedPhaseTables = new Set([
  '_prisma_migrations',
  'actor_identity',
  'audit_event',
  'idempotency_record',
  'outbox_event',
  'role_grant',
  'service_heartbeat',
  'synthetic_session',
  'supplier',
  'supplier_relationship',
  'catalog_source',
  'source_snapshot',
  'source_entity',
  'catalog_sync_run',
  'catalog_sync_item',
  'catalog_sync_difference',
  'catalog_version',
  'product_family',
  'product_category',
  'product_system',
  'product_model',
  'material',
  'color',
  'material_variant',
  'material_property',
  'media_asset',
  'source_media_asset',
  'material_media_asset',
  'compatibility_rule',
  'dimension_constraint',
  'source_price_record',
  'price_version',
  'price_version_record',
  'business_catalog_entry',
  'availability_record',
  'local_price_override',
  'publication_record',
  'catalog_version_entry',
]);

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.next', '.turbo', 'coverage', 'dist', 'node_modules', 'test'].includes(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const errors = [];
for (const rootName of ['apps', 'packages']) {
  for (const file of await collectFiles(join(repositoryRoot, rootName))) {
    const repositoryPath = relative(repositoryRoot, file).replaceAll('\\', '/');
    const segments = repositoryPath.toLowerCase().split('/');
    const forbiddenSegment = segments.find((segment) => forbiddenPathSegments.has(segment));
    if (forbiddenSegment !== undefined) {
      errors.push(`${repositoryPath}: later-phase path segment '${forbiddenSegment}' is forbidden`);
    }
    if (['.js', '.mjs', '.ts', '.tsx'].includes(extname(file))) {
      const source = await readFile(file, 'utf8');
      if (/\b(?:whatsapp|configurator|visualizer|starfield)\b/i.test(source)) {
        errors.push(`${repositoryPath}: later-phase feature reference is forbidden`);
      }
    }
  }
}

const schemaPath = join(repositoryRoot, 'packages', 'db', 'prisma', 'schema.prisma');
const schema = await readFile(schemaPath, 'utf8');
for (const match of schema.matchAll(/^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/gm)) {
  if (!allowedPrismaModels.has(match[1])) {
    errors.push(`packages/db/prisma/schema.prisma: model ${match[1]} is outside Phase 1B.1`);
  }
}

const migrationRoot = join(repositoryRoot, 'packages', 'db', 'prisma', 'migrations');
for (const file of await collectFiles(migrationRoot)) {
  if (extname(file) !== '.sql') continue;
  const sql = await readFile(file, 'utf8');
  for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:"public"\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
    if (!allowedPhaseTables.has(match[1].toLowerCase())) {
      errors.push(`${relative(repositoryRoot, file)}: table ${match[1]} is outside Phase 1B.1`);
    }
  }
}

const allowedRouteFiles = new Set([
  'apps/web/app/api/v1/health/live/route.ts',
  'apps/web/app/api/v1/health/ready/route.ts',
]);
for (const file of await collectFiles(join(repositoryRoot, 'apps', 'web', 'app'))) {
  const repositoryPath = relative(repositoryRoot, file).replaceAll('\\', '/');
  if (file.endsWith('route.ts') && !allowedRouteFiles.has(repositoryPath)) {
    errors.push(`${repositoryPath}: route is outside the current Phase 1B.1 allowlist`);
  }
  if (file.endsWith('page.tsx') && repositoryPath !== 'apps/web/app/page.tsx') {
    errors.push(`${repositoryPath}: page is outside the current Phase 1B.1 allowlist`);
  }
}

if (errors.length > 0) {
  process.stderr.write(
    ['Phase 1B.1 scope validation failed:', ...errors.map((error) => `- ${error}`)].join('\n'),
  );
  process.stderr.write('\n');
  process.exitCode = 1;
} else {
  process.stdout.write(
    'Phase 1B.1 scope validation passed: only Foundation and catalog-pilot surfaces exist.\n',
  );
}
