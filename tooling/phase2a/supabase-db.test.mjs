import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSupabaseDatabaseUrl } from './supabase-db.mjs';

const databaseUrl = (protocol, authorityAndPath) => `${protocol}://${authorityAndPath}`;

test('separate password is encoded and overrides an embedded password', () => {
  const result = resolveSupabaseDatabaseUrl({
    SUPABASE_DB_PASSWORD: 'new@password#100%',
    SUPABASE_DB_URL: databaseUrl('postgresql', 'postgres.project:old@pooler.example:6543/postgres'),
  });

  assert.equal(
    result.connectionString,
    databaseUrl(
      'postgresql',
      'postgres.project:new%40password%23100%25@pooler.example:6543/postgres',
    ),
  );
  assert.equal(result.source, 'SUPABASE_DB_URL');
});

test('raw special characters in an embedded password are normalized', () => {
  const result = resolveSupabaseDatabaseUrl({
    SUPABASE_DB_URL: databaseUrl(
      'postgresql',
      'postgres.project:raw@pass#word%@pooler.example:6543/postgres',
    ),
  });

  assert.equal(
    result.connectionString,
    databaseUrl('postgresql', 'postgres.project:raw%40pass%23word%25@pooler.example:6543/postgres'),
  );
});

test('migration URL has priority and preserves an encoded password', () => {
  const result = resolveSupabaseDatabaseUrl({
    MIGRATION_DATABASE_URL: databaseUrl(
      'postgres',
      'postgres.project:already%40encoded@pooler.example:5432/postgres?sslmode=require',
    ),
    SUPABASE_DB_URL: databaseUrl('postgres', 'ignored:ignored@ignored.example/postgres'),
  });

  assert.equal(
    result.connectionString,
    databaseUrl(
      'postgres',
      'postgres.project:already%40encoded@pooler.example:5432/postgres?sslmode=require',
    ),
  );
  assert.equal(result.source, 'MIGRATION_DATABASE_URL');
});

test('missing database URL fails closed', () => {
  assert.throws(() => resolveSupabaseDatabaseUrl({}), /SUPABASE_DB_URL/u);
});
