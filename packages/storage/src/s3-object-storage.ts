import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  UploadPartCommand,
  type CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageEnvironment } from '@project-name/config/server';
import { foundationMetrics } from '@project-name/observability/metrics';
import { runInFoundationSpan } from '@project-name/observability/tracing';
import { createHash } from 'node:crypto';

import { isStorageError, StorageError } from './errors.js';
import {
  assertContentLength,
  assertContentType,
  assertGrantTtl,
  assertObjectLocator,
  assertSignedWriteInput,
  createProviderMetadata,
  validateProviderMetadata,
} from './validation.js';
import {
  type ObjectLocator,
  type ObjectStorage,
  type ObjectZone,
  type PutObjectInput,
  type SignedObjectGrant,
  type SignedWriteInput,
  type StorageObjectMetadata,
  type StoredObject,
  syntheticObjectSource,
} from './types.js';

const bucketsForEnvironment = (environment: StorageEnvironment): Record<ObjectZone, string> => ({
  private: environment.S3_BUCKET_PRIVATE,
  public: environment.S3_BUCKET_PUBLIC,
  quarantine: environment.S3_BUCKET_QUARANTINE,
});

const immutableWriteTails = new Map<string, Promise<void>>();

async function withImmutableWriteLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const preceding = immutableWriteTails.get(key) ?? Promise.resolve();
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = preceding.then(() => gate);
  immutableWriteTails.set(key, tail);

  await preceding;
  try {
    return await operation();
  } finally {
    release();
    if (immutableWriteTails.get(key) === tail) {
      immutableWriteTails.delete(key);
    }
  }
}

function sha256Hex(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function checksumBase64(checksumSha256: string): string {
  return Buffer.from(checksumSha256, 'hex').toString('base64');
}

function mapProviderError(error: unknown): StorageError {
  if (isStorageError(error)) {
    return error;
  }
  if (error instanceof S3ServiceException) {
    if (error.$metadata.httpStatusCode === 404 || error.name === 'NoSuchKey') {
      return new StorageError('STORAGE_NOT_FOUND', 'Stored object was not found.');
    }
    if ([409, 412].includes(error.$metadata.httpStatusCode ?? 0)) {
      return new StorageError('STORAGE_CONFLICT', 'Stored object already exists.');
    }
  }
  return new StorageError(
    'STORAGE_DEPENDENCY_UNAVAILABLE',
    'Object storage is temporarily unavailable.',
  );
}

export class S3ObjectStorage implements ObjectStorage {
  readonly #buckets: Record<ObjectZone, string>;
  readonly #client: S3Client;
  readonly #environment: StorageEnvironment;

  constructor(environment: StorageEnvironment) {
    this.#environment = environment;
    this.#buckets = bucketsForEnvironment(environment);
    this.#client = new S3Client({
      credentials: {
        accessKeyId: environment.S3_ACCESS_KEY_ID,
        secretAccessKey: environment.S3_SECRET_ACCESS_KEY,
      },
      endpoint: environment.S3_ENDPOINT,
      forcePathStyle: environment.S3_FORCE_PATH_STYLE,
      maxAttempts: environment.S3_MAX_ATTEMPTS,
      region: environment.S3_REGION,
    });
  }

  async #observe<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    let outcome: 'failure' | 'success' = 'failure';
    try {
      const result = await runInFoundationSpan(
        `storage.${operationName}`,
        { 'storage.operation.name': operationName },
        operation,
      );
      outcome = 'success';
      return result;
    } finally {
      foundationMetrics.record({
        component: 'storage',
        durationMs: performance.now() - startedAt,
        operation: `storage.${operationName}`,
        outcome,
      });
    }
  }

  async #runWithTimeout<T>(
    operationName: string,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#environment.S3_REQUEST_TIMEOUT_MS);
    timeout.unref();
    try {
      return await this.#observe(operationName, () => operation(controller.signal));
    } catch (error) {
      throw mapProviderError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  #bucket(locator: ObjectLocator): string {
    assertObjectLocator(locator);
    return this.#buckets[locator.zone];
  }

  async #putSingle(input: PutObjectInput, bucket: string, checksumSha256: string): Promise<void> {
    await this.#runWithTimeout('put', (abortSignal) =>
      this.#client.send(
        new PutObjectCommand({
          Body: input.body,
          Bucket: bucket,
          ChecksumSHA256: checksumBase64(checksumSha256),
          ContentLength: input.body.byteLength,
          ContentType: input.contentType,
          IfNoneMatch: '*',
          Key: input.locator.key,
          Metadata: createProviderMetadata(
            input.locator.zone,
            input.body.byteLength,
            checksumSha256,
            input.source,
          ),
        }),
        { abortSignal },
      ),
    );
  }

  async #putMultipart(
    input: PutObjectInput,
    bucket: string,
    checksumSha256: string,
  ): Promise<void> {
    let uploadId: string | undefined;
    try {
      const created = await this.#runWithTimeout('multipart_create', (abortSignal) =>
        this.#client.send(
          new CreateMultipartUploadCommand({
            Bucket: bucket,
            ContentType: input.contentType,
            Key: input.locator.key,
            Metadata: createProviderMetadata(
              input.locator.zone,
              input.body.byteLength,
              checksumSha256,
              input.source,
            ),
          }),
          { abortSignal },
        ),
      );
      uploadId = created.UploadId;
      if (uploadId === undefined) {
        throw new StorageError(
          'STORAGE_METADATA_INVALID',
          'Multipart upload identifier is invalid.',
        );
      }

      const completedParts: CompletedPart[] = [];
      const partSize = this.#environment.S3_MULTIPART_PART_SIZE_BYTES;
      for (let offset = 0, partNumber = 1; offset < input.body.byteLength; partNumber += 1) {
        const body = input.body.slice(offset, Math.min(offset + partSize, input.body.byteLength));
        const uploaded = await this.#runWithTimeout('multipart_upload_part', (abortSignal) =>
          this.#client.send(
            new UploadPartCommand({
              Body: body,
              Bucket: bucket,
              ContentLength: body.byteLength,
              Key: input.locator.key,
              PartNumber: partNumber,
              UploadId: uploadId,
            }),
            { abortSignal },
          ),
        );
        if (uploaded.ETag === undefined) {
          throw new StorageError('STORAGE_METADATA_INVALID', 'Multipart part ETag is invalid.');
        }
        completedParts.push({ ETag: uploaded.ETag, PartNumber: partNumber });
        offset += body.byteLength;
      }

      await this.#runWithTimeout('multipart_complete', (abortSignal) =>
        this.#client.send(
          new CompleteMultipartUploadCommand({
            Bucket: bucket,
            IfNoneMatch: '*',
            Key: input.locator.key,
            MultipartUpload: { Parts: completedParts },
            UploadId: uploadId,
          }),
          { abortSignal },
        ),
      );
    } catch (error) {
      if (uploadId !== undefined) {
        try {
          await this.#runWithTimeout('multipart_abort', (abortSignal) =>
            this.#client.send(
              new AbortMultipartUploadCommand({
                Bucket: bucket,
                Key: input.locator.key,
                UploadId: uploadId,
              }),
              { abortSignal },
            ),
          );
        } catch {
          // Preserve the original operation error; orphan detection is covered by the contract gate.
        }
      }
      throw error;
    }
  }

  async #resolveIdempotentConflict(
    input: PutObjectInput,
    checksumSha256: string,
    error: unknown,
  ): Promise<StorageObjectMetadata> {
    if (!isStorageError(error) || error.code !== 'STORAGE_CONFLICT') {
      throw error;
    }
    const existing = await this.head(input.locator);
    if (
      existing.checksumSha256 === checksumSha256 &&
      existing.contentLength === input.body.byteLength &&
      existing.contentType === input.contentType &&
      existing.source === (input.source ?? syntheticObjectSource)
    ) {
      return existing;
    }
    throw error;
  }

  async checkReadiness(): Promise<'ok' | 'unavailable'> {
    try {
      await Promise.all(
        Object.values(this.#buckets).map((bucket) =>
          this.#runWithTimeout('readiness', (abortSignal) =>
            this.#client.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal }),
          ),
        ),
      );
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  async put(input: PutObjectInput): Promise<StorageObjectMetadata> {
    const bucket = this.#bucket(input.locator);
    assertContentType(input.contentType);
    assertContentLength(input.body.byteLength, this.#environment.S3_MAX_OBJECT_BYTES);
    const checksumSha256 = sha256Hex(input.body);
    const lockKey = `${this.#environment.S3_ENDPOINT}\u0000${bucket}\u0000${input.locator.key}`;
    return withImmutableWriteLock(lockKey, async () => {
      try {
        if (input.body.byteLength > this.#environment.S3_MULTIPART_THRESHOLD_BYTES) {
          await this.#putMultipart(input, bucket, checksumSha256);
        } else {
          await this.#putSingle(input, bucket, checksumSha256);
        }
        return await this.head(input.locator);
      } catch (error) {
        return this.#resolveIdempotentConflict(input, checksumSha256, error);
      }
    });
  }

  async head(locator: ObjectLocator): Promise<StorageObjectMetadata> {
    const bucket = this.#bucket(locator);
    const response = await this.#runWithTimeout('head', (abortSignal) =>
      this.#client.send(new HeadObjectCommand({ Bucket: bucket, Key: locator.key }), {
        abortSignal,
      }),
    );
    return validateProviderMetadata(locator, response);
  }

  async get(locator: ObjectLocator): Promise<StoredObject> {
    const bucket = this.#bucket(locator);
    const response = await this.#runWithTimeout('get', (abortSignal) =>
      this.#client.send(new GetObjectCommand({ Bucket: bucket, Key: locator.key }), {
        abortSignal,
      }),
    );
    const metadata = validateProviderMetadata(locator, response);
    if (response.Body === undefined) {
      throw new StorageError('STORAGE_METADATA_INVALID', 'Stored object content is invalid.');
    }
    const body = Uint8Array.from(await response.Body.transformToByteArray());
    if (body.byteLength !== metadata.contentLength || sha256Hex(body) !== metadata.checksumSha256) {
      throw new StorageError('STORAGE_METADATA_INVALID', 'Stored object content is invalid.');
    }
    return { ...metadata, body, locator };
  }

  async delete(locator: ObjectLocator): Promise<void> {
    const bucket = this.#bucket(locator);
    await this.#runWithTimeout('delete', (abortSignal) =>
      this.#client.send(new DeleteObjectCommand({ Bucket: bucket, Key: locator.key }), {
        abortSignal,
      }),
    );
  }

  async createSignedReadGrant(
    locator: ObjectLocator,
    ttlSeconds = this.#environment.SIGNED_URL_TTL_SECONDS,
  ): Promise<SignedObjectGrant> {
    const bucket = this.#bucket(locator);
    assertGrantTtl(ttlSeconds, this.#environment.SIGNED_URL_TTL_SECONDS);
    let url: string;
    try {
      url = await this.#observe('signed_read', async () => {
        await this.head(locator);
        return getSignedUrl(
          this.#client,
          new GetObjectCommand({ Bucket: bucket, Key: locator.key }),
          { expiresIn: ttlSeconds },
        );
      });
    } catch (error) {
      throw mapProviderError(error);
    }
    return {
      expiresAt: new Date(Date.now() + ttlSeconds * 1_000),
      method: 'GET',
      requiredHeaders: {},
      url,
    };
  }

  async createSignedWriteGrant(
    input: SignedWriteInput,
    ttlSeconds = this.#environment.SIGNED_URL_TTL_SECONDS,
  ): Promise<SignedObjectGrant> {
    const bucket = this.#bucket(input.locator);
    assertSignedWriteInput(input, this.#environment.S3_MAX_OBJECT_BYTES);
    assertGrantTtl(ttlSeconds, this.#environment.SIGNED_URL_TTL_SECONDS);
    const providerMetadata = createProviderMetadata(
      input.locator.zone,
      input.contentLength,
      input.checksumSha256,
      input.source,
    );
    const checksum = checksumBase64(input.checksumSha256);
    const command = new PutObjectCommand({
      Bucket: bucket,
      ChecksumSHA256: checksum,
      ContentLength: input.contentLength,
      ContentType: input.contentType,
      IfNoneMatch: '*',
      Key: input.locator.key,
      Metadata: providerMetadata,
    });
    let url: string;
    try {
      url = await this.#observe('signed_write', () =>
        getSignedUrl(this.#client, command, { expiresIn: ttlSeconds }),
      );
    } catch (error) {
      throw mapProviderError(error);
    }
    return {
      expiresAt: new Date(Date.now() + ttlSeconds * 1_000),
      method: 'PUT',
      requiredHeaders: {
        'content-length': String(input.contentLength),
        'content-type': input.contentType,
        'if-none-match': '*',
        'x-amz-checksum-sha256': checksum,
        ...Object.fromEntries(
          Object.entries(providerMetadata).map(([key, value]) => [`x-amz-meta-${key}`, value]),
        ),
      },
      url,
    };
  }

  getPublicReadUrl(locator: ObjectLocator): string {
    assertObjectLocator(locator);
    if (locator.zone !== 'public') {
      throw new StorageError(
        'STORAGE_VALIDATION_ERROR',
        'Only public-zone objects have an anonymous read URL.',
      );
    }
    const endpoint = new URL(this.#environment.S3_ENDPOINT);
    const encodedKey = locator.key.split('/').map(encodeURIComponent).join('/');
    endpoint.pathname = `/${this.#buckets.public}/${encodedKey}`;
    return endpoint.toString();
  }
}

export function createS3ObjectStorage(environment: StorageEnvironment): ObjectStorage {
  return new S3ObjectStorage(environment);
}
