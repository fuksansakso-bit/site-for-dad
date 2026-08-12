import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ARTIFACT_ROOT } from './constants.mjs';

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function sha256(value) {
  const input = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalJson(value);
  return createHash('sha256').update(input).digest('hex');
}

export async function readJson(filePath) {
  const content = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/u, '');
  return JSON.parse(content);
}

export async function writeJson(filePath, value) {
  const resolved = path.resolve(filePath);
  const allowedRoot = `${path.resolve(ARTIFACT_ROOT)}${path.sep}`;
  if (!resolved.startsWith(allowedRoot)) {
    throw new Error(`Refusing to write migration artifact outside ${ARTIFACT_ROOT}`);
  }
  await mkdir(path.dirname(resolved), { recursive: true });
  const content = canonicalJson(value);
  await writeFile(resolved, content, { encoding: 'utf8', flag: 'w' });
  return { bytes: Buffer.byteLength(content), sha256: sha256(content) };
}

export function assertUnique(rows, key, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`${label} has an empty ${key}`);
    }
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(`${label} duplicate ${key}: ${[...duplicates].sort().join(', ')}`);
  }
}

export function sortBy(rows, ...keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const comparison = String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en');
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

export function integer(value) {
  const number = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
