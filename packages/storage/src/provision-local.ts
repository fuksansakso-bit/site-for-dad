import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { parseStorageEnvironment, type StorageEnvironment } from '@project-name/config/server';

function statusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('$metadata' in error)) return undefined;
  const metadata = error.$metadata;
  if (typeof metadata !== 'object' || metadata === null || !('httpStatusCode' in metadata)) {
    return undefined;
  }
  return typeof metadata.httpStatusCode === 'number' ? metadata.httpStatusCode : undefined;
}

function createAdministrativeClient(environment: StorageEnvironment): S3Client {
  return new S3Client({
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

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (statusCode(error) !== 404) throw error;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function removeBucketPolicy(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new DeleteBucketPolicyCommand({ Bucket: bucket }));
  } catch (error) {
    if (![404, 405].includes(statusCode(error) ?? 0)) throw error;
  }
}

const environment = parseStorageEnvironment(process.env);
if (!['local', 'test', 'ci'].includes(environment.APP_ENV)) {
  throw new Error('Disposable storage provisioning is unavailable for this environment profile.');
}

const client = createAdministrativeClient(environment);
try {
  await ensureBucket(client, environment.S3_BUCKET_PUBLIC);
  await ensureBucket(client, environment.S3_BUCKET_PRIVATE);
  await ensureBucket(client, environment.S3_BUCKET_QUARANTINE);
  await removeBucketPolicy(client, environment.S3_BUCKET_PUBLIC);
  await removeBucketPolicy(client, environment.S3_BUCKET_PRIVATE);
  await removeBucketPolicy(client, environment.S3_BUCKET_QUARANTINE);
  process.stdout.write(
    `${JSON.stringify({ allBucketsPrivate: true, event: 'storage.local.provisioned', trustZones: 3 })}\n`,
  );
} finally {
  client.destroy();
}
