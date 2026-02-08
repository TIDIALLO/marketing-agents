import { Client } from 'minio';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'mkt-content-media';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }
  return client;
}

async function ensureBucket(): Promise<void> {
  const mc = getClient();
  const exists = await mc.bucketExists(MINIO_BUCKET);
  if (!exists) {
    await mc.makeBucket(MINIO_BUCKET);
  }
}

export async function uploadBuffer(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  try {
    await ensureBucket();
    const mc = getClient();
    await mc.putObject(MINIO_BUCKET, objectPath, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    const protocol = MINIO_USE_SSL ? 'https' : 'http';
    return `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET}/${objectPath}`;
  } catch (err) {
    console.error('[MinIO] Upload failed:', err);
    // Fallback for dev without MinIO
    return `http://localhost:9000/${MINIO_BUCKET}/${objectPath}`;
  }
}

export async function uploadFromUrl(
  objectPath: string,
  sourceUrl: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/png';
  return uploadBuffer(objectPath, buffer, contentType);
}
