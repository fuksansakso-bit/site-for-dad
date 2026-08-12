#!/usr/bin/env node

import { loadEnvFile } from 'node:process';

import pg from 'pg';

import { resolveSupabaseDatabaseUrl } from './supabase-db.mjs';

const ENV_PATH = new URL('../../apps/web/.env.local', import.meta.url);
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
];

function loadEnvironment() {
  try {
    loadEnvFile(ENV_PATH);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('apps/web/.env.local не найден. Скопируйте значения из .env.example.');
    }
    throw error;
  }
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Не заполнены переменные: ${missing.join(', ')}`);
}

async function checkEndpoint(baseUrl, key, path, { count = false } = {}) {
  try {
    const response = await fetch(new URL(path, baseUrl), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(count ? { Prefer: 'count=exact', Range: '0-0' } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    let code = null;
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      code = body && typeof body === 'object' && 'code' in body ? String(body.code) : null;
    }
    const contentRange = response.headers.get('content-range');
    const totalMatch = contentRange?.match(/\/(\d+)$/);
    return {
      code,
      ok: response.ok,
      status: response.status,
      ...(count ? { total: totalMatch ? Number(totalMatch[1]) : null } : {}),
    };
  } catch (error) {
    return {
      code: error instanceof Error ? error.name : 'UNKNOWN',
      ok: false,
      status: 0,
    };
  }
}

async function checkDatabase(connectionString) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const identity = await client.query(
      "select current_database() as database, current_user as username, current_setting('server_version_num') as version",
    );
    const tables = await client.query(
      "select count(*)::integer as count from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    const migrations = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') is not null as present",
    );
    return {
      connected: true,
      database: identity.rows[0].database,
      migrationHistory: migrations.rows[0].present,
      publicTables: tables.rows[0].count,
      serverVersion: identity.rows[0].version,
      userClass: String(identity.rows[0].username).startsWith('postgres') ? 'postgres' : 'other',
    };
  } catch (error) {
    return {
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN',
      connected: false,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

try {
  loadEnvironment();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { connectionString: databaseUrl } = resolveSupabaseDatabaseUrl();
  const [
    publicCatalog,
    serviceCatalog,
    publicMaterials,
    publicPortfolio,
    publicSettings,
    storage,
    database,
  ] = await Promise.all([
    checkEndpoint(baseUrl, publishableKey, '/rest/v1/public_categories?select=slug', {
      count: true,
    }),
    checkEndpoint(baseUrl, serviceRoleKey, '/rest/v1/public_categories?select=slug', {
      count: true,
    }),
    checkEndpoint(baseUrl, publishableKey, '/rest/v1/public_materials?select=slug', {
      count: true,
    }),
    checkEndpoint(baseUrl, publishableKey, '/rest/v1/public_portfolio_items?select=title', {
      count: true,
    }),
    checkEndpoint(baseUrl, publishableKey, '/rest/v1/public_site_settings?select=site_name', {
      count: true,
    }),
    checkEndpoint(baseUrl, publishableKey, '/storage/v1/status'),
    checkDatabase(databaseUrl),
  ]);
  process.stdout.write(
    `${JSON.stringify({
      database,
      projectHost: new URL(baseUrl).hostname,
      publicCatalog,
      publicMaterials,
      publicPortfolio,
      publicSettings,
      serviceCatalog,
      storage,
    })}\n`,
  );
  if (!database.connected) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Cloud preflight failed'}\n`);
  process.exitCode = 1;
}
