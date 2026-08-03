import {
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListMultipartUploadsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { parseStorageEnvironment, type StorageEnvironment } from '@project-name/config/server';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createS3ObjectStorage } from '../../src/s3-object-storage.js';

const environment = parseStorageEnvironment(process.env);
const storage = createS3ObjectStorage(environment);
const administrativeClient = createAdministrativeClient(environment);
const gateRunId = process.env['STORAGE_GATE_RUN_ID'] ?? randomUUID();
const gatePrefix = `storage-gate/${gateRunId}`;
let amigoImage = new Uint8Array();

const storageGateSizes = [
  { label: '1-byte', size: 1 },
  { label: '65536-bytes', size: 65_536 },
  { label: '131072-bytes', size: 131_072 },
  { label: '159099-bytes', size: 159_099 },
  { label: '262144-bytes', size: 262_144 },
  { label: 'amigo-515180-bytes', size: 515_180 },
  { label: '1-mib', size: 1_024 * 1_024 },
  { label: '5-mib', size: 5 * 1_024 * 1_024 },
  {
    label: 'above-multipart-threshold',
    size: environment.S3_MULTIPART_THRESHOLD_BYTES + 1_024 * 1_024,
  },
] as const;

function createAdministrativeClient(configuration: StorageEnvironment): S3Client {
  return new S3Client({
    credentials: {
      accessKeyId: configuration.S3_ACCESS_KEY_ID,
      secretAccessKey: configuration.S3_SECRET_ACCESS_KEY,
    },
    endpoint: configuration.S3_ENDPOINT,
    forcePathStyle: configuration.S3_FORCE_PATH_STYLE,
    maxAttempts: configuration.S3_MAX_ATTEMPTS,
    region: configuration.S3_REGION,
  });
}

function sha256(body: Uint8Array): string {
  return createHash('sha256').update(body).digest('hex');
}

function deterministicBody(size: number): Uint8Array {
  const body = new Uint8Array(size);
  for (let index = 0; index < body.byteLength; index += 1) {
    body[index] = (index * 31 + size) % 251;
  }
  return body;
}

function asFetchBody(body: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(body.byteLength);
  copy.set(body);
  return copy.buffer;
}

function bodyForSize(size: number): Uint8Array {
  return size === 515_180 ? amigoImage : deterministicBody(size);
}

beforeAll(async () => {
  expect(await storage.checkReadiness()).toBe('ok');
  const amigoImagePath = process.env['AMIGO_STORAGE_GATE_IMAGE_PATH'];
  if (amigoImagePath === undefined || amigoImagePath === '') {
    throw new Error('AMIGO_STORAGE_GATE_IMAGE_PATH is required by the real-image storage gate.');
  }
  amigoImage = Uint8Array.from(await readFile(amigoImagePath));
  expect(amigoImage.byteLength).toBe(515_180);
});

afterAll(() => administrativeClient.destroy());

describe('S3-compatible object storage contract', () => {
  it.each(storageGateSizes)(
    'round trips $label with put/head/get/checksum/signed grants/delete',
    async ({ label, size }) => {
      expect(size).toBeLessThanOrEqual(environment.S3_MAX_OBJECT_BYTES);
      const body = bodyForSize(size);
      const checksumSha256 = sha256(body);
      const contentType = size === 515_180 ? 'image/jpeg' : 'application/octet-stream';
      const source = size === 515_180 ? 'AMIGO_CATALOG_PILOT' : 'SYNTHETIC_TEST';
      const locator = { key: `${gatePrefix}/matrix/${label}.bin`, zone: 'private' } as const;

      const putMetadata = await storage.put({ body, contentType, locator, source });
      const headMetadata = await storage.head(locator);
      expect(putMetadata).toMatchObject({
        checksumSha256,
        contentLength: size,
        contentType,
        schemaVersion: 1,
        source,
        zone: 'private',
      });
      expect(headMetadata).toEqual(putMetadata);

      const downloaded = await storage.get(locator);
      expect(downloaded.body).toEqual(body);
      expect(sha256(downloaded.body)).toBe(checksumSha256);
      expect(downloaded).toMatchObject({
        checksumSha256,
        contentLength: size,
        contentType,
        schemaVersion: 1,
        source,
        zone: 'private',
      });

      const readGrant = await storage.createSignedReadGrant(locator, 30);
      const readUrl = new URL(readGrant.url);
      expect(readUrl.pathname).toContain(`/${environment.S3_BUCKET_PRIVATE}/`);
      expect(readUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      const signedRead = await fetch(readGrant.url, {
        headers: readGrant.requiredHeaders,
        method: readGrant.method,
      });
      expect(signedRead.status).toBe(200);
      expect(new Uint8Array(await signedRead.arrayBuffer())).toEqual(body);

      await storage.delete(locator);
      await expect(storage.head(locator)).rejects.toMatchObject({ code: 'STORAGE_NOT_FOUND' });

      const signedLocator = {
        key: `${gatePrefix}/matrix/${label}-signed.bin`,
        zone: 'private',
      } as const;
      const writeGrant = await storage.createSignedWriteGrant(
        { checksumSha256, contentLength: size, contentType, locator: signedLocator, source },
        30,
      );
      const writeUrl = new URL(writeGrant.url);
      expect(writeUrl.pathname).toContain(`/${environment.S3_BUCKET_PRIVATE}/`);
      expect(writeUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
      const signedWrite = await fetch(writeGrant.url, {
        body: asFetchBody(body),
        headers: writeGrant.requiredHeaders,
        method: writeGrant.method,
      });
      expect(signedWrite.status).toBe(200);
      const signedMetadata = await storage.head(signedLocator);
      expect(signedMetadata).toMatchObject({
        checksumSha256,
        contentLength: size,
        contentType,
        source,
      });
      expect((await storage.get(signedLocator)).body).toEqual(body);
      await storage.delete(signedLocator);
      await expect(storage.head(signedLocator)).rejects.toMatchObject({
        code: 'STORAGE_NOT_FOUND',
      });
    },
    120_000,
  );

  it('keeps all trust-zone buckets private and denies anonymous listing/write/read', async () => {
    const body = deterministicBody(64);
    const publicLocator = { key: `${gatePrefix}/delivery/private.jpg`, zone: 'public' } as const;
    await storage.put({ body, contentType: 'image/jpeg', locator: publicLocator });

    for (const bucket of [
      environment.S3_BUCKET_PUBLIC,
      environment.S3_BUCKET_PRIVATE,
      environment.S3_BUCKET_QUARANTINE,
    ]) {
      const listing = await fetch(`${environment.S3_ENDPOINT}/${bucket}`);
      expect(listing.status).toBe(403);
    }

    const anonymousRead = await fetch(storage.getPublicReadUrl(publicLocator));
    const anonymousWrite = await fetch(storage.getPublicReadUrl(publicLocator), {
      body: asFetchBody(deterministicBody(64)),
      method: 'PUT',
    });
    expect(anonymousRead.status).toBe(403);
    expect(anonymousWrite.status).toBe(403);

    const controlledRead = await storage.createSignedReadGrant(publicLocator, 30);
    const response = await fetch(controlledRead.url);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    await storage.delete(publicLocator);
  });

  it('supports idempotent content-addressed upload and rejects a different body at the same key', async () => {
    const body = deterministicBody(262_144);
    const locator = { key: `${gatePrefix}/dedup/${sha256(body)}.bin`, zone: 'private' } as const;
    const first = await storage.put({ body, contentType: 'application/octet-stream', locator });
    const second = await storage.put({ body, contentType: 'application/octet-stream', locator });
    expect(second).toEqual(first);

    await expect(
      storage.put({
        body: deterministicBody(262_145),
        contentType: 'application/octet-stream',
        locator,
      }),
    ).rejects.toMatchObject({ code: 'STORAGE_CONFLICT' });
    expect((await storage.get(locator)).body).toEqual(body);
    await storage.delete(locator);
  });

  it('supports multipart completion and explicit abort without leaving an upload', async () => {
    const multipartBody = deterministicBody(
      environment.S3_MULTIPART_THRESHOLD_BYTES + 1_024 * 1_024,
    );
    const completedLocator = {
      key: `${gatePrefix}/multipart/completed.bin`,
      zone: 'private',
    } as const;
    const completed = await storage.put({
      body: multipartBody,
      contentType: 'application/octet-stream',
      locator: completedLocator,
    });
    expect(completed.checksumSha256).toBe(sha256(multipartBody));
    expect((await storage.get(completedLocator)).body).toEqual(multipartBody);

    const abortedKey = `${gatePrefix}/multipart/aborted.bin`;
    const created = await administrativeClient.send(
      new CreateMultipartUploadCommand({
        Bucket: environment.S3_BUCKET_PRIVATE,
        ContentType: 'application/octet-stream',
        Key: abortedKey,
      }),
    );
    expect(created.UploadId).toBeDefined();
    await administrativeClient.send(
      new UploadPartCommand({
        Body: deterministicBody(1),
        Bucket: environment.S3_BUCKET_PRIVATE,
        Key: abortedKey,
        PartNumber: 1,
        UploadId: created.UploadId,
      }),
    );
    await administrativeClient.send(
      new AbortMultipartUploadCommand({
        Bucket: environment.S3_BUCKET_PRIVATE,
        Key: abortedKey,
        UploadId: created.UploadId,
      }),
    );
    const pending = await administrativeClient.send(
      new ListMultipartUploadsCommand({ Bucket: environment.S3_BUCKET_PRIVATE }),
    );
    expect(pending.Uploads?.some((upload) => upload.Key === abortedKey)).not.toBe(true);
    await expect(storage.head({ key: abortedKey, zone: 'private' })).rejects.toMatchObject({
      code: 'STORAGE_NOT_FOUND',
    });
    await storage.delete(completedLocator);
  }, 120_000);

  it('rejects invalid MIME syntax, excessive size, incorrect checksum, and malformed metadata', async () => {
    const body = deterministicBody(128);
    await expect(
      storage.put({
        body,
        contentType: 'invalid mime',
        locator: { key: `${gatePrefix}/invalid/mime.bin`, zone: 'private' },
      }),
    ).rejects.toMatchObject({ code: 'STORAGE_VALIDATION_ERROR' });
    await expect(
      storage.put({
        body: new Uint8Array(environment.S3_MAX_OBJECT_BYTES + 1),
        contentType: 'application/octet-stream',
        locator: { key: `${gatePrefix}/invalid/excessive.bin`, zone: 'private' },
      }),
    ).rejects.toMatchObject({ code: 'STORAGE_VALIDATION_ERROR' });

    const checksumLocator = {
      key: `${gatePrefix}/invalid/wrong-checksum.bin`,
      zone: 'private',
    } as const;
    const checksumGrant = await storage.createSignedWriteGrant(
      {
        checksumSha256: '0'.repeat(64),
        contentLength: body.byteLength,
        contentType: 'application/octet-stream',
        locator: checksumLocator,
      },
      30,
    );
    const checksumResponse = await fetch(checksumGrant.url, {
      body: asFetchBody(body),
      headers: checksumGrant.requiredHeaders,
      method: checksumGrant.method,
    });
    expect(checksumResponse.status).toBeGreaterThanOrEqual(400);
    await expect(storage.head(checksumLocator)).rejects.toMatchObject({
      code: 'STORAGE_NOT_FOUND',
    });

    const malformedKey = `${gatePrefix}/invalid/malformed-metadata.bin`;
    await administrativeClient.send(
      new PutObjectCommand({
        Body: body,
        Bucket: environment.S3_BUCKET_PRIVATE,
        ContentType: 'application/octet-stream',
        Key: malformedKey,
        Metadata: { 'foundation-schema': '999' },
      }),
    );
    await expect(storage.head({ key: malformedKey, zone: 'private' })).rejects.toMatchObject({
      code: 'STORAGE_METADATA_INVALID',
    });
    await storage.delete({ key: malformedKey, zone: 'private' });
  });

  it('uploads different files concurrently and resolves a same-key race safely', async () => {
    const firstBody = deterministicBody(159_099);
    const secondBody = deterministicBody(262_144);
    const firstLocator = { key: `${gatePrefix}/concurrent/first.bin`, zone: 'private' } as const;
    const secondLocator = { key: `${gatePrefix}/concurrent/second.bin`, zone: 'private' } as const;
    await Promise.all([
      storage.put({
        body: firstBody,
        contentType: 'application/octet-stream',
        locator: firstLocator,
      }),
      storage.put({
        body: secondBody,
        contentType: 'application/octet-stream',
        locator: secondLocator,
      }),
    ]);
    expect((await storage.get(firstLocator)).body).toEqual(firstBody);
    expect((await storage.get(secondLocator)).body).toEqual(secondBody);

    const raceLocator = { key: `${gatePrefix}/concurrent/same-key.bin`, zone: 'private' } as const;
    const race = await Promise.allSettled([
      storage.put({
        body: firstBody,
        contentType: 'application/octet-stream',
        locator: raceLocator,
      }),
      storage.put({
        body: secondBody,
        contentType: 'application/octet-stream',
        locator: raceLocator,
      }),
    ]);
    expect(race.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = race.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'STORAGE_CONFLICT' } });
    const raceBody = (await storage.get(raceLocator)).body;
    expect([sha256(firstBody), sha256(secondBody)]).toContain(sha256(raceBody));

    await Promise.all([
      storage.delete(firstLocator),
      storage.delete(secondLocator),
      storage.delete(raceLocator),
    ]);
  });

  it('maps bounded timeout, retries, and unavailable dependency to safe errors', async () => {
    let retryRequests = 0;
    const retryServer = createServer((_request, response) => {
      retryRequests += 1;
      response.statusCode = 503;
      response.setHeader('content-type', 'application/xml');
      response.end('<Error><Code>ServiceUnavailable</Code></Error>');
    });
    await new Promise<void>((resolve) => retryServer.listen(0, '127.0.0.1', resolve));
    const retryAddress = retryServer.address();
    if (retryAddress === null || typeof retryAddress === 'string')
      throw new Error('No retry port.');
    const retrying = createS3ObjectStorage({
      ...environment,
      S3_ENDPOINT: `http://127.0.0.1:${retryAddress.port}`,
      S3_REQUEST_TIMEOUT_MS: 5_000,
    });
    expect(await retrying.checkReadiness()).toBe('unavailable');
    expect(retryRequests).toBeGreaterThanOrEqual(environment.S3_MAX_ATTEMPTS);
    await new Promise<void>((resolve, reject) =>
      retryServer.close((error) => (error === undefined ? resolve() : reject(error))),
    );

    const timeoutServer = createServer(() => undefined);
    await new Promise<void>((resolve) => timeoutServer.listen(0, '127.0.0.1', resolve));
    const timeoutAddress = timeoutServer.address();
    if (timeoutAddress === null || typeof timeoutAddress === 'string') {
      throw new Error('No timeout port.');
    }
    const timedOut = createS3ObjectStorage({
      ...environment,
      S3_ENDPOINT: `http://127.0.0.1:${timeoutAddress.port}`,
      S3_REQUEST_TIMEOUT_MS: 150,
    });
    const startedAt = performance.now();
    expect(await timedOut.checkReadiness()).toBe('unavailable');
    expect(performance.now() - startedAt).toBeLessThan(2_000);
    timeoutServer.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      timeoutServer.close((error) => (error === undefined ? resolve() : reject(error))),
    );

    const unavailable = createS3ObjectStorage({
      ...environment,
      S3_ENDPOINT: 'http://127.0.0.1:1',
      S3_REQUEST_TIMEOUT_MS: 250,
    });
    expect(await unavailable.checkReadiness()).toBe('unavailable');
  }, 30_000);
});
