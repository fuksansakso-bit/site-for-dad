import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const forbiddenPathSegments = new Set([
  'admin',
  'ai',
  'amigo',
  'calculator',
  'cart',
  'catalog',
  'configurator',
  'installment',
  'materials',
  'orders',
  'photos',
  'pricing',
  'products',
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
]);
const allowedFoundationTables = new Set([
  '_prisma_migrations',
  'actor_identity',
  'audit_event',
  'idempotency_record',
  'outbox_event',
  'role_grant',
  'service_heartbeat',
  'synthetic_session',
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
      errors.push(`${repositoryPath}: Phase 1B+ path segment '${forbiddenSegment}' is forbidden`);
    }
    if (['.js', '.mjs', '.ts', '.tsx'].includes(extname(file))) {
      const source = await readFile(file, 'utf8');
      if (/\b(?:amigo|whatsapp)\b/i.test(source)) {
        errors.push(`${repositoryPath}: external business integration reference is forbidden`);
      }
    }
  }
}

const schemaPath = join(repositoryRoot, 'packages', 'db', 'prisma', 'schema.prisma');
const schema = await readFile(schemaPath, 'utf8');
for (const match of schema.matchAll(/^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/gm)) {
  if (!allowedPrismaModels.has(match[1])) {
    errors.push(`packages/db/prisma/schema.prisma: model ${match[1]} is outside Phase 1A`);
  }
}

const migrationRoot = join(repositoryRoot, 'packages', 'db', 'prisma', 'migrations');
for (const file of await collectFiles(migrationRoot)) {
  if (extname(file) !== '.sql') continue;
  const sql = await readFile(file, 'utf8');
  for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:"public"\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
    if (!allowedFoundationTables.has(match[1].toLowerCase())) {
      errors.push(`${relative(repositoryRoot, file)}: table ${match[1]} is outside Phase 1A`);
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
    errors.push(`${repositoryPath}: only Phase 1A health routes are allowed`);
  }
  if (file.endsWith('page.tsx') && repositoryPath !== 'apps/web/app/page.tsx') {
    errors.push(`${repositoryPath}: only the technical Foundation page is allowed`);
  }
}

if (errors.length > 0) {
  process.stderr.write(
    ['Phase 1A scope validation failed:', ...errors.map((error) => `- ${error}`)].join('\n'),
  );
  process.stderr.write('\n');
  process.exitCode = 1;
} else {
  process.stdout.write(
    'Phase 1A scope validation passed: only Foundation surfaces and tables exist.\n',
  );
}
