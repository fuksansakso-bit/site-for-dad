import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const webRoot = join(root, 'apps', 'web');
const errors = [];

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.next', 'coverage', 'node_modules'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const forbiddenPaths = ['app/configure', 'app/preview', 'app/login', 'app/quote', 'app/api/v1'];
const forbiddenImports = [
  '@project-name/db',
  '@project-name/identity',
  '@project-name/jobs',
  '@project-name/preview',
  '@project-name/storage',
  '@prisma/client',
  'graphile-worker',
];

for (const file of await filesIn(webRoot)) {
  const path = relative(webRoot, file).replaceAll('\\', '/');
  if (forbiddenPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    errors.push(`apps/web/${path}: legacy runtime path remains active`);
  }
  if (/\.(?:[cm]?[jt]sx?|json)$/u.test(path)) {
    const source = await readFile(file, 'utf8');
    for (const dependency of forbiddenImports) {
      if (source.includes(dependency)) errors.push(`apps/web/${path}: imports ${dependency}`);
    }
  }
}

const workspace = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
if (!/^\s*- apps\/web\s*$/mu.test(workspace)) errors.push('pnpm workspace must include apps/web');
if (/^\s*- (?:apps\/worker|packages\/)/mu.test(workspace)) {
  errors.push('legacy worker/packages remain in the active workspace');
}

const webPackage = JSON.parse(await readFile(join(webRoot, 'package.json'), 'utf8'));
for (const dependency of Object.keys(webPackage.dependencies ?? {})) {
  if (forbiddenImports.includes(dependency) || dependency.startsWith('@aws-sdk/')) {
    errors.push(`apps/web/package.json: legacy dependency ${dependency}`);
  }
}

if (errors.length) {
  process.stderr.write(
    `Phase 2A scope validation failed:\n${errors.map((x) => `- ${x}`).join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    'Phase 2A scope validation passed: only the Next.js + Supabase web runtime is active; AI, preview, worker, Prisma and Docker services are excluded.\n',
  );
}
