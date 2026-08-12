import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

import { REPOSITORY_ROOT } from './constants.mjs';

function localLegacyUrl(password) {
  const url = new URL('postgresql://foundation_runtime@127.0.0.1:55432/foundation');
  url.port = process.env.LEGACY_DATABASE_PORT ?? '55432';
  url.password = password;
  return url.toString();
}

export async function resolveLegacyDatabaseUrl() {
  if (process.env.LEGACY_DATABASE_URL) {
    return { connectionString: process.env.LEGACY_DATABASE_URL, source: 'LEGACY_DATABASE_URL' };
  }

  const secretsPath = path.join(
    REPOSITORY_ROOT,
    '.local',
    'foundation-environment',
    'secrets.json',
  );
  let secrets;
  try {
    secrets = JSON.parse((await readFile(secretsPath, 'utf8')).replace(/^\uFEFF/u, ''));
  } catch (error) {
    throw new Error(
      'LEGACY_DATABASE_URL is required when ignored local foundation secrets are unavailable.',
      { cause: error },
    );
  }
  if (typeof secrets.runtimePassword !== 'string' || secrets.runtimePassword.length < 1) {
    throw new Error('Local foundation runtime password is unavailable; set LEGACY_DATABASE_URL.');
  }
  return {
    connectionString: localLegacyUrl(secrets.runtimePassword),
    source: 'local-foundation-runtime',
  };
}

function loadPg() {
  try {
    const databaseRequire = createRequire(
      path.join(REPOSITORY_ROOT, 'packages', 'db', 'package.json'),
    );
    return databaseRequire('pg');
  } catch (error) {
    throw new Error('Install workspace dependencies before running Phase 2A migration commands.', {
      cause: error,
    });
  }
}

export async function withLegacySnapshot(operation) {
  const { connectionString, source } = await resolveLegacyDatabaseUrl();
  const { Client } = loadPg();
  const client = new Client({
    application_name: 'phase-2a-read-only-etl',
    connectionString,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 60_000,
  });
  await client.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const database = await client.query(
      `SELECT current_database() AS name,
              pg_database_size(current_database())::bigint::text AS bytes,
              current_setting('server_version') AS server_version`,
    );
    const value = await operation(client, { database: database.rows[0], source });
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

export async function countExistingTable(client, tableName) {
  if (!/^[a-z][a-z0-9_]*$/u.test(tableName)) throw new Error('Unsafe legacy table name');
  const exists = await client.query('SELECT to_regclass($1) IS NOT NULL AS present', [
    `public.${tableName}`,
  ]);
  if (exists.rows[0]?.present !== true) return { count: 0, present: false };
  const result = await client.query(`SELECT count(*)::bigint::text AS count FROM ${tableName}`);
  return { count: Number.parseInt(result.rows[0].count, 10), present: true };
}
