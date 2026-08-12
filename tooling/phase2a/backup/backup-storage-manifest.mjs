#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)
  throw new Error('Service role must never use NEXT_PUBLIC_ prefix');
const requireFromWeb = createRequire(path.resolve('apps/web/package.json'));
const { createClient } = requireFromWeb('@supabase/supabase-js');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const buckets = ['branding', 'catalog', 'portfolio'];
const objects = [];
async function walk(bucket, prefix = '') {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`Storage list failed for ${bucket}/${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const name = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id)
        objects.push({
          bucket,
          path: name,
          sizeBytes: item.metadata?.size ?? null,
          etag: item.metadata?.eTag ?? null,
          updatedAt: item.updated_at ?? null,
        });
      else await walk(bucket, name);
    }
    if (!data || data.length < 1000) break;
    offset += data.length;
  }
}
for (const bucket of buckets) await walk(bucket);
objects.sort((a, b) => `${a.bucket}/${a.path}`.localeCompare(`${b.bucket}/${b.path}`));
const stamp = new Date().toISOString().replaceAll(':', '-');
const directory = path.resolve('.local/phase-2a-backups', stamp);
await mkdir(directory, { recursive: true });
const manifest = {
  buckets,
  createdAt: new Date().toISOString(),
  objectCount: objects.length,
  objects,
  schemaVersion: 1,
};
await writeFile(
  path.join(directory, 'storage-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: 'wx' },
);
process.stdout.write(
  `Storage manifest created: ${directory} (${objects.length} objects; no secret values)\n`,
);
