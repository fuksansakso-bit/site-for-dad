#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { resolveSupabaseDatabaseUrl } from '../supabase-db.mjs';

const { connectionString: connection } = resolveSupabaseDatabaseUrl();
const stamp = new Date().toISOString().replaceAll(':', '-');
const directory = path.resolve('.local/phase-2a-backups', stamp);
await mkdir(directory, { recursive: true });
const dump = path.join(directory, 'database.dump');
const parsedConnection = new URL(connection);
const password = decodeURIComponent(parsedConnection.password);
parsedConnection.password = '';
parsedConnection.searchParams.delete('pgbouncer');
const credentialFreeConnection = parsedConnection.toString();
const pgDumpExecutable = process.env.PG_DUMP_PATH?.trim() || 'pg_dump';
await new Promise((resolve, reject) => {
  const child = spawn(
    pgDumpExecutable,
    ['--format=custom', '--no-owner', '--no-acl', '--file', dump, credentialFreeConnection],
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  child.once('error', (error) => {
    reject(
      new Error('pg_dump is unavailable or failed to start', {
        cause: { code: error.code },
      }),
    );
  });
  child.once('exit', (code) =>
    code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)),
  );
});
const bytes = await readFile(dump);
const manifest = {
  createdAt: new Date().toISOString(),
  databaseFile: 'database.dump',
  format: 'pg_dump-custom',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  sizeBytes: bytes.byteLength,
};
await writeFile(
  path.join(directory, 'database-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: 'wx' },
);
process.stdout.write(
  `Database backup verified locally: ${directory} (${bytes.byteLength} bytes)\n`,
);
