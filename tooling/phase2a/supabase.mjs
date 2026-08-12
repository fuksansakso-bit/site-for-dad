import path from 'node:path';

import { ARTIFACT_ROOT, TRANSFORM_ROOT } from './constants.mjs';
import { readJson, writeJson } from './io.mjs';

function credentials() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlValue || !key) return null;
  const url = new URL(urlValue);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid SUPABASE_URL protocol');
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Remote Supabase URL must use HTTPS');
  }
  return { key, url: url.toString().replace(/\/$/u, '') };
}

export function hasSupabaseCredentials() {
  return credentials() !== null;
}

async function request(endpoint, options = {}) {
  const configured = credentials();
  if (configured === null) {
    throw new Error(
      'SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
    );
  }
  const response = await fetch(`${configured.url}${endpoint}`, {
    ...options,
    headers: {
      apikey: configured.key,
      Authorization: `Bearer ${configured.key}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  const body =
    text.length === 0
      ? null
      : (() => {
          try {
            return JSON.parse(text);
          } catch {
            return { message: text.slice(0, 500) };
          }
        })();
  if (!response.ok) {
    const code = body?.code ?? `HTTP_${response.status}`;
    throw new Error(`Supabase migration request failed (${code}); no secret was logged.`);
  }
  return { body, headers: response.headers, status: response.status };
}

export async function loadTransformBundle() {
  const manifest = await readJson(path.join(TRANSFORM_ROOT, 'manifest.json'));
  const names = [
    'categories',
    'materials',
    'orders',
    'portfolio',
    'site-settings',
    'category-exclusions',
  ];
  const values = await Promise.all(
    names.map((name) => readJson(path.join(TRANSFORM_ROOT, `${name}.json`))),
  );
  return {
    bundle: {
      categories: values[0],
      materials: values[1],
      orders: values[2],
      portfolio: values[3],
      siteSettings: values[4],
      categoryExclusions: values[5],
    },
    manifest,
  };
}

export async function importToSupabase() {
  const { bundle, manifest } = await loadTransformBundle();
  const response = await request('/rest/v1/rpc/phase2a_import', {
    body: JSON.stringify({
      p_payload: bundle,
      p_source_fingerprint: manifest.sourceFingerprint,
      p_transform_fingerprint: manifest.transformFingerprint,
    }),
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  });
  const result = {
    importedCounts: manifest.counts,
    rpcResult: response.body,
    sourceFingerprint: manifest.sourceFingerprint,
    transformFingerprint: manifest.transformFingerprint,
  };
  await writeJson(path.join(ARTIFACT_ROOT, 'import-result.json'), result);
  return result;
}

export async function cloudTableRows(table, select = 'legacy_source_id') {
  const response = await request(
    `/rest/v1/${table}?select=${encodeURIComponent(select)}&legacy_source_id=not.is.null`,
    {
      headers: { Prefer: 'count=exact', Range: '0-9999' },
      method: 'GET',
    },
  );
  return {
    count: Number.parseInt(
      response.headers.get('content-range')?.split('/')[1] ?? String(response.body?.length ?? 0),
      10,
    ),
    rows: Array.isArray(response.body) ? response.body : [],
  };
}
