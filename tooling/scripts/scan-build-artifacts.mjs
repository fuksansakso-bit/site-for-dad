import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const requiredArtifactRoots = [join(repositoryRoot, 'apps', 'web', '.next')];
const optionalArtifactRoots = [];
const secretKeys = [
  'ARTIFACT_SECRET_CANARY',
  'DATABASE_URL',
  'MIGRATION_DATABASE_URL',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'SESSION_SIGNING_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const maximumFileBytes = 32 * 1024 * 1024;

async function pathIsDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

for (const requiredRoot of requiredArtifactRoots) {
  if (!(await pathIsDirectory(requiredRoot))) {
    throw new Error(
      `Required build artifact is missing: ${relative(repositoryRoot, requiredRoot)}`,
    );
  }
}

const canaries = [...new Set(secretKeys.map((key) => process.env[key]).filter(Boolean))].filter(
  (value) => value.length >= 8,
);
if (canaries.length === 0) {
  throw new Error('Artifact scan requires generated server-secret canaries in the environment.');
}

const roots = [...requiredArtifactRoots];
for (const optionalRoot of optionalArtifactRoots) {
  if (await pathIsDirectory(optionalRoot)) roots.push(optionalRoot);
}

const files = [];
for (const root of roots) {
  for (const file of await collectFiles(root)) {
    files.push(file);
  }
}

const findings = [];
for (const file of files) {
  const metadata = await stat(file);
  if (metadata.size > maximumFileBytes) continue;
  const content = await readFile(file);
  if (canaries.some((canary) => content.includes(Buffer.from(canary)))) {
    findings.push(relative(repositoryRoot, file));
  }
}

if (findings.length > 0) {
  process.stderr.write('Generated artifacts contain a server-secret canary (values suppressed):\n');
  for (const finding of findings.sort()) process.stderr.write(`- ${finding}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Artifact secret scan passed across ${files.length} files for ${canaries.length} generated canaries.\n`,
  );
}
