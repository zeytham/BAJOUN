import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function offsiteConfig() {
  const bucket = process.env.OFFSITE_S3_BUCKET || '';
  const accessKeyId = process.env.OFFSITE_S3_ACCESS_KEY || '';
  const secretAccessKey = process.env.OFFSITE_S3_SECRET_KEY || '';
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region: process.env.OFFSITE_S3_REGION || 'us-east-1',
    endpoint: process.env.OFFSITE_S3_ENDPOINT || undefined,
    prefix: (process.env.OFFSITE_S3_PREFIX || 'phonevault').replace(/\/$/, ''),
    credentials: { accessKeyId, secretAccessKey },
  };
}

/**
 * Second backup copy, outside the shop server.
 * Works with Amazon S3 and Backblaze B2 (S3-compatible endpoint).
 * Credentials stay empty until the owner provides them.
 */
export async function uploadOffsite({ fileName, body, checksum }) {
  const config = offsiteConfig();
  if (!config) {
    return {
      uploaded: false,
      location: '',
      detail: 'Offsite copy is ready to send, but S3/B2 keys are not set yet. Daily SQLite backup on this server is already saved.',
    };
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: config.credentials,
  });
  const key = `${config.prefix}/${fileName}`;
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: 'application/octet-stream',
    Metadata: { sha256: checksum, format: 'sqlite-aes-256-gcm' },
  }));

  const where = config.endpoint ? `${config.endpoint}/${config.bucket}/${key}` : `s3://${config.bucket}/${key}`;
  return {
    uploaded: true,
    location: where,
    detail: `Encrypted SQLite copy uploaded outside the shop server (${where}).`,
  };
}
