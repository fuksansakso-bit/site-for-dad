import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const forbiddenPathSegments = new Set([
  'accounts',
  'ai',
  'calculator',
  'credit',
  'payments',
  'photos',
  'starfield',
  'uploads',
  'visualizer',
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
  'CatalogSyncCheckpoint',
  'CatalogSyncDifference',
  'CatalogDifferenceReviewBatch',
  'CatalogBulkCommand',
  'CatalogImportManifest',
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
  'PricingRule',
  'PricingParityRun',
  'PricingCalculation',
  'QuoteSnapshot',
  'PricingVersionDecision',
  'StandardPreviewState',
  'GuestCartSession',
  'GuestCart',
  'CartItem',
  'CartItemRevision',
  'OrderInquiry',
  'RequestItemSnapshot',
  'RequestCommunicationEvent',
  'RequestInternalNote',
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
  'catalog_sync_checkpoint',
  'catalog_sync_difference',
  'catalog_difference_review_batch',
  'catalog_bulk_command',
  'catalog_import_manifest',
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
  'pricing_rule',
  'pricing_parity_run',
  'pricing_calculation',
  'quote_snapshot',
  'pricing_version_decision',
  'standard_preview_state',
  'guest_cart_session',
  'guest_cart',
  'cart_item',
  'cart_item_revision',
  'order_inquiry',
  'request_item_snapshot',
  'request_communication_event',
  'request_internal_note',
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
      if (/\b(?:visualizer|starfield|payment_intent|checkout_session)\b/i.test(source)) {
        errors.push(`${repositoryPath}: later-phase feature reference is forbidden`);
      }
    }
  }
}

const schemaPath = join(repositoryRoot, 'packages', 'db', 'prisma', 'schema.prisma');
const schema = await readFile(schemaPath, 'utf8');
for (const match of schema.matchAll(/^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/gm)) {
  if (!allowedPrismaModels.has(match[1])) {
    errors.push(`packages/db/prisma/schema.prisma: model ${match[1]} is outside Phase 1E`);
  }
}

const migrationRoot = join(repositoryRoot, 'packages', 'db', 'prisma', 'migrations');
for (const file of await collectFiles(migrationRoot)) {
  if (extname(file) !== '.sql') continue;
  const sql = await readFile(file, 'utf8');
  for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:"public"\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
    if (!allowedPhaseTables.has(match[1].toLowerCase())) {
      errors.push(`${relative(repositoryRoot, file)}: table ${match[1]} is outside Phase 1E`);
    }
  }
}

const allowedRouteFiles = new Set([
  'apps/web/app/api/v1/admin/pricing/activate/route.ts',
  'apps/web/app/api/v1/admin/pricing/overrides/route.ts',
  'apps/web/app/api/v1/admin/pricing/parity/route.ts',
  'apps/web/app/api/v1/admin/pricing/reject/route.ts',
  'apps/web/app/api/v1/admin/pricing/route.ts',
  'apps/web/app/api/v1/admin/previews/diagnostics/route.ts',
  'apps/web/app/api/v1/catalog/materials/[id]/route.ts',
  'apps/web/app/api/v1/catalog/materials/route.ts',
  'apps/web/app/api/v1/catalog/media/[id]/route.ts',
  'apps/web/app/api/v1/health/live/route.ts',
  'apps/web/app/api/v1/health/ready/route.ts',
  'apps/web/app/api/v1/configurator/route.ts',
  'apps/web/app/api/v1/configurator/validate/route.ts',
  'apps/web/app/api/v1/pricing/calculate/route.ts',
  'apps/web/app/api/v1/pricing/request-price/route.ts',
  'apps/web/app/api/v1/quotes/[token]/route.ts',
  'apps/web/app/api/v1/quotes/route.ts',
  'apps/web/app/api/v1/quotes/request/route.ts',
  'apps/web/app/api/v1/previews/[id]/asset/route.ts',
  'apps/web/app/api/v1/previews/[id]/layers/[role]/route.ts',
  'apps/web/app/api/v1/previews/[id]/route.ts',
  'apps/web/app/api/v1/previews/eligibility/route.ts',
  'apps/web/app/api/v1/previews/route.ts',
  'apps/web/app/api/v1/previews/scenes/route.ts',
  'apps/web/app/api/v1/previews/scenes/[sceneId]/asset/route.ts',
  'apps/web/app/api/v1/cart/route.ts',
  'apps/web/app/api/v1/cart/items/route.ts',
  'apps/web/app/api/v1/cart/items/[itemReference]/route.ts',
  'apps/web/app/api/v1/cart/items/[itemReference]/duplicate/route.ts',
  'apps/web/app/api/v1/cart/items/[itemReference]/edit-source/route.ts',
  'apps/web/app/api/v1/requests/route.ts',
  'apps/web/app/api/v1/requests/public/[publicReference]/route.ts',
  'apps/web/app/api/v1/requests/public/[publicReference]/items/[sequence]/preview/route.ts',
  'apps/web/app/api/v1/requests/[publicReference]/handoff/route.ts',
  'apps/web/app/api/v1/requests/[publicReference]/events/route.ts',
  'apps/web/app/api/v1/admin/requests/route.ts',
  'apps/web/app/api/v1/admin/requests/[requestNumber]/route.ts',
  'apps/web/app/api/v1/admin/requests/[requestNumber]/status/route.ts',
  'apps/web/app/api/v1/admin/requests/[requestNumber]/notes/route.ts',
]);
const allowedPageFiles = new Set([
  'apps/web/app/admin/catalog/page.tsx',
  'apps/web/app/admin/pricing/page.tsx',
  'apps/web/app/admin/preview/page.tsx',
  'apps/web/app/catalog/[slug]/page.tsx',
  'apps/web/app/catalog/page.tsx',
  'apps/web/app/configure/page.tsx',
  'apps/web/app/page.tsx',
  'apps/web/app/preview/page.tsx',
  'apps/web/app/quote/[token]/page.tsx',
  'apps/web/app/cart/page.tsx',
  'apps/web/app/checkout/page.tsx',
  'apps/web/app/request/[publicReference]/page.tsx',
  'apps/web/app/admin/requests/page.tsx',
  'apps/web/app/admin/requests/[requestNumber]/page.tsx',
]);
for (const file of await collectFiles(join(repositoryRoot, 'apps', 'web', 'app'))) {
  const repositoryPath = relative(repositoryRoot, file).replaceAll('\\', '/');
  if (file.endsWith('route.ts') && !allowedRouteFiles.has(repositoryPath)) {
    errors.push(`${repositoryPath}: route is outside the current Phase 1E allowlist`);
  }
  if (file.endsWith('page.tsx') && !allowedPageFiles.has(repositoryPath)) {
    errors.push(`${repositoryPath}: page is outside the current Phase 1E allowlist`);
  }
}

if (errors.length > 0) {
  process.stderr.write(
    ['Phase 1E scope validation failed:', ...errors.map((error) => `- ${error}`)].join('\n'),
  );
  process.stderr.write('\n');
  process.exitCode = 1;
} else {
  process.stdout.write(
    'Phase 1E scope validation passed: only Foundation, catalog, configurator/pricing, deterministic preview and cart/request/WhatsApp basic-intake surfaces exist.\n',
  );
}
