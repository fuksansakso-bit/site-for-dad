import { createPasswordlessIdentityAdapter } from '@project-name/identity/passwordless';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Usage: pnpm dev:owner --email owner@example.test`);
  }
  return value;
}

const repositoryRoot = resolve(import.meta.dirname, '../..');
const secrets = JSON.parse(
  (
    await readFile(resolve(repositoryRoot, '.local/foundation-environment/secrets.json'), 'utf8')
  ).replace(/^\uFEFF/, ''),
) as { runtimePassword?: string; sessionSigningKey?: string };
if (secrets.runtimePassword === undefined || secrets.sessionSigningKey === undefined) {
  throw new Error('Local environment is not initialized. Run pnpm dev first.');
}
const databaseUrl = new URL('postgresql://foundation_runtime@127.0.0.1:55432/foundation');
databaseUrl.password = secrets.runtimePassword;
databaseUrl.searchParams.set('schema', 'public');
databaseUrl.searchParams.set('connect_timeout', '5');

const adapter = createPasswordlessIdentityAdapter(
  {
    APP_ENV: 'local',
    DATABASE_STATEMENT_TIMEOUT_MS: 5_000,
    DATABASE_URL: databaseUrl.toString(),
    LOG_LEVEL: 'info',
  },
  {
    APP_ENV: 'local',
    LOG_LEVEL: 'info',
    SESSION_SIGNING_KEY: secrets.sessionSigningKey,
    SYNTHETIC_IDENTITY_ENABLED: true,
  },
);

try {
  const owner = await adapter.bootstrapLocalOwner(argument('--email'), {
    correlationId: randomUUID(),
  });
  process.stdout.write(
    `${JSON.stringify({ actorId: owner.actorId, role: 'OWNER', status: 'ready' })}\n`,
  );
} finally {
  await adapter.close();
}
