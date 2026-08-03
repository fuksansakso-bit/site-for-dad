import { parseStorageEnvironment } from '@project-name/config/server';
import { createHash } from 'node:crypto';

import { createS3ObjectStorage } from '../../src/s3-object-storage.js';

const mode = process.argv[2];
if (mode !== 'seed' && mode !== 'verify') {
  throw new Error('Restart persistence mode must be seed or verify.');
}

const key = process.env['STORAGE_PERSISTENCE_KEY'];
if (key === undefined || key === '') {
  throw new Error('STORAGE_PERSISTENCE_KEY is required.');
}

const environment = parseStorageEnvironment(process.env);
const storage = createS3ObjectStorage(environment);
const locator = { key, zone: 'private' } as const;
const body = new TextEncoder().encode(`restart-persistence:${key}`);
const checksumSha256 = createHash('sha256').update(body).digest('hex');

if (mode === 'seed') {
  const metadata = await storage.put({ body, contentType: 'text/plain', locator });
  if (metadata.checksumSha256 !== checksumSha256) {
    throw new Error('Restart persistence seed checksum mismatch.');
  }
} else {
  const stored = await storage.get(locator);
  if (
    stored.checksumSha256 !== checksumSha256 ||
    stored.body.byteLength !== body.byteLength ||
    !stored.body.every((value, index) => value === body[index])
  ) {
    throw new Error('Restart persistence verification mismatch.');
  }
  await storage.delete(locator);
}

process.stdout.write(
  `${JSON.stringify({ checksumSha256, event: 'storage.restart-persistence', mode, status: 'passed' })}\n`,
);
