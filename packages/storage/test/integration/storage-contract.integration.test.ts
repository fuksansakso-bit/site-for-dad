import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { parseStorageEnvironment, type StorageEnvironment } from '@project-name/config/server';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createS3ObjectStorage } from '../../src/s3-object-storage.js';

const environment = parseStorageEnvironment(process.env);
const storage = createS3ObjectStorage(environment);
const administrativeClient = createAdministrativeClient(environment);
const textEncoder = new TextEncoder();

function createAdministrativeClient(configuration: StorageEnvironment): S3Client {
  return new S3Client({
    credentials: {
      accessKeyId: configuration.S3_ACCESS_KEY_ID,
      secretAccessKey: configuration.S3_SECRET_ACCESS_KEY,
    },
    endpoint: configuration.S3_ENDPOINT,
    forcePathStyle: configuration.S3_FORCE_PATH_STYLE,
    maxAttempts: 1,
    region: configuration.S3_REGION,
  });
}

function anonymousObjectUrl(bucket: string, key: string): string {
  const endpoint = new URL(environment.S3_ENDPOINT);
  endpoint.pathname = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  return endpoint.toString();
}

async function createTrustZoneBuckets(): Promise<void> {
  for (const bucket of [
    environment.S3_BUCKET_PUBLIC,
    environment.S3_BUCKET_PRIVATE,
    environment.S3_BUCKET_QUARANTINE,
  ]) {
    await administrativeClient.send(new CreateBucketCommand({ Bucket: bucket }));
  }

  await administrativeClient.send(
    new PutBucketPolicyCommand({
      Bucket: environment.S3_BUCKET_PUBLIC,
      Policy: JSON.stringify({
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: '*',
            Resource: [`arn:aws:s3:::${environment.S3_BUCKET_PUBLIC}/*`],
            Sid: 'FoundationPublicReadOnly',
          },
        ],
        Version: '2012-10-17',
      }),
    }),
  );
}

beforeAll(createTrustZoneBuckets);
afterAll(() => administrativeClient.destroy());

describe('S3-compatible object storage contract', () => {
  it('persists checksum-bound synthetic objects without allowing overwrite', async () => {
    const locator = { key: 'foundation/private-contract.txt', zone: 'private' } as const;
    const body = textEncoder.encode('private synthetic fixture');

    const stored = await storage.put({ body, contentType: 'text/plain', locator });
    expect(stored).toMatchObject({
      contentLength: body.byteLength,
      contentType: 'text/plain',
      schemaVersion: 1,
      source: 'SYNTHETIC_TEST',
      zone: 'private',
    });
    expect((await storage.get(locator)).body).toEqual(body);
    await expect(storage.put({ body, contentType: 'text/plain', locator })).rejects.toMatchObject({
      code: 'STORAGE_CONFLICT',
    });
    expect(await storage.checkReadiness()).toBe('ok');
  });

  it('allows anonymous public reads while denying listing, private reads, and anonymous writes', async () => {
    const publicLocator = { key: 'foundation/public-contract.txt', zone: 'public' } as const;
    const privateLocator = { key: 'foundation/private-contract.txt', zone: 'private' } as const;
    const quarantineLocator = {
      key: 'foundation/quarantine-contract.txt',
      zone: 'quarantine',
    } as const;
    const body = textEncoder.encode('public synthetic fixture');

    await storage.put({ body, contentType: 'text/plain', locator: publicLocator });
    await storage.put({ body, contentType: 'text/plain', locator: quarantineLocator });

    const publicRead = await fetch(storage.getPublicReadUrl(publicLocator));
    expect(publicRead.status).toBe(200);
    expect(new Uint8Array(await publicRead.arrayBuffer())).toEqual(body);

    const privateRead = await fetch(
      anonymousObjectUrl(environment.S3_BUCKET_PRIVATE, privateLocator.key),
    );
    const quarantineRead = await fetch(
      anonymousObjectUrl(environment.S3_BUCKET_QUARANTINE, quarantineLocator.key),
    );
    const publicListing = await fetch(`${environment.S3_ENDPOINT}/${environment.S3_BUCKET_PUBLIC}`);
    const anonymousWrite = await fetch(storage.getPublicReadUrl(publicLocator), {
      body: textEncoder.encode('forbidden overwrite'),
      method: 'PUT',
    });

    expect(privateRead.status).toBe(403);
    expect(quarantineRead.status).toBe(403);
    expect(publicListing.status).toBe(403);
    expect(anonymousWrite.status).toBe(403);
    await expect(storage.head({ key: privateLocator.key, zone: 'public' })).rejects.toMatchObject({
      code: 'STORAGE_NOT_FOUND',
    });
  });

  it('issues scoped read/write grants and rejects malformed provider metadata', async () => {
    const readLocator = { key: 'foundation/private-contract.txt', zone: 'private' } as const;
    const readGrant = await storage.createSignedReadGrant(readLocator, 30);
    const signedRead = await fetch(readGrant.url, {
      headers: readGrant.requiredHeaders,
      method: readGrant.method,
    });
    expect(signedRead.status).toBe(200);

    const body = textEncoder.encode('signed synthetic fixture');
    const writeLocator = { key: 'foundation/signed-write.txt', zone: 'private' } as const;
    const writeGrant = await storage.createSignedWriteGrant(
      {
        checksumSha256: createHash('sha256').update(body).digest('hex'),
        contentLength: body.byteLength,
        contentType: 'text/plain',
        locator: writeLocator,
      },
      30,
    );
    const signedWrite = await fetch(writeGrant.url, {
      body,
      headers: writeGrant.requiredHeaders,
      method: writeGrant.method,
    });
    expect(signedWrite.status).toBe(200);
    expect((await storage.get(writeLocator)).body).toEqual(body);

    const malformedKey = 'foundation/malformed-metadata.txt';
    await administrativeClient.send(
      new PutObjectCommand({
        Body: textEncoder.encode('invalid metadata'),
        Bucket: environment.S3_BUCKET_PRIVATE,
        ContentType: 'text/plain',
        Key: malformedKey,
        Metadata: { 'foundation-schema': '999' },
      }),
    );
    await expect(storage.head({ key: malformedKey, zone: 'private' })).rejects.toMatchObject({
      code: 'STORAGE_METADATA_INVALID',
    });
  });

  it('degrades safely when the object dependency is unavailable', async () => {
    const unavailable = createS3ObjectStorage({
      ...environment,
      S3_ENDPOINT: 'http://127.0.0.1:1',
      S3_REQUEST_TIMEOUT_MS: 250,
    });
    expect(await unavailable.checkReadiness()).toBe('unavailable');
  });
});
