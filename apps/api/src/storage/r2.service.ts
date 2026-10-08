import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, normalize, sep } from 'path';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isTruthyEnv(value: string | undefined) {
  return ['1', 'true', 'yes'].includes((value ?? '').trim().toLowerCase());
}

export function requiresDurableUploadStorage() {
  return (
    isProduction() ||
    isTruthyEnv(process.env.FAIRWAYD_REQUIRE_DURABLE_UPLOADS) ||
    !!process.env.NEON_DATABASE_URL
  );
}

function localUploadsPath(key: string) {
  const uploadsRoot = join(process.cwd(), 'uploads');
  const safeKey = key
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join(sep);
  const filePath = normalize(join(uploadsRoot, safeKey));

  if (!filePath.startsWith(normalize(uploadsRoot + sep))) {
    throw new Error('Invalid upload path');
  }

  return { filePath, publicPath: `/uploads/${safeKey.replace(/\\/g, '/')}` };
}

async function writeLocalUpload(key: string, buffer: Buffer) {
  const { filePath, publicPath } = localUploadsPath(key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return publicPath;
}

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const endpoint = process.env.R2_ENDPOINT || '';
  const bucket = process.env.R2_BUCKET || '';
  const hasR2Config =
    endpoint &&
    bucket &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;
  const durableStorageRequired = requiresDurableUploadStorage();

  if (!hasR2Config) {
    if (!durableStorageRequired) {
      console.warn('[storage] R2 config missing; using local upload fallback', {
        key,
        contentType,
        bytes: buffer.length,
      });
      return writeLocalUpload(key, buffer);
    }

    throw new Error('R2 storage is not configured');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await client.send(command);
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    const code = err?.Code ?? err?.name;

    console.error('[storage] R2 upload failed', {
      key,
      contentType,
      bytes: buffer.length,
      status,
      code,
      message: err?.message ?? String(err),
    });

    if (!durableStorageRequired) {
      console.warn('[storage] Using local upload fallback after R2 failure', {
        key,
        contentType,
        bytes: buffer.length,
      });
      return writeLocalUpload(key, buffer);
    }

    throw err;
  }

  const publicUrl = (process.env.R2_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (!publicUrl) {
    if (durableStorageRequired) {
      console.error(
        '[storage] R2 public URL missing while durable storage is required',
        {
          key,
          contentType,
          bytes: buffer.length,
        },
      );
      throw new Error('R2 public URL is not configured');
    }

    return key;
  }
  let normalizedPublicUrl = publicUrl;

  if (publicUrl.startsWith('//')) {
    normalizedPublicUrl = `https:${publicUrl}`;
  } else if (
    !publicUrl.startsWith('/') &&
    !publicUrl.startsWith('http://') &&
    !publicUrl.startsWith('https://') &&
    /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/|$)/i.test(publicUrl)
  ) {
    normalizedPublicUrl = `https://${publicUrl}`;
  }

  return `${normalizedPublicUrl}/${key}`;
}

export async function uploadPrivateToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const endpoint = process.env.R2_ENDPOINT || '';
  const bucket = process.env.R2_BUCKET || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const hasR2Config = endpoint && bucket && accessKeyId && secretAccessKey;

  if (!hasR2Config) {
    if (!requiresDurableUploadStorage()) return writeLocalUpload(key, buffer);
    throw new Error('R2 storage is not configured');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `r2://${key}`;
}

export async function readStoredUpload(fileUrl: string) {
  if (fileUrl.startsWith('/uploads/')) {
    const relativeKey = fileUrl.slice('/uploads/'.length);
    const { filePath } = localUploadsPath(relativeKey);
    return readFile(filePath);
  }

  if (fileUrl.startsWith('r2://') || fileUrl.startsWith('trips/')) {
    const key = fileUrl.startsWith('r2://')
      ? fileUrl.slice('r2://'.length)
      : fileUrl;
    const endpoint = process.env.R2_ENDPOINT || '';
    const bucket = process.env.R2_BUCKET || '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    if (!key || !endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 storage is not configured');
    }
    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!result.Body) throw new Error('Stored upload has no content');
    return Buffer.from(await result.Body.transformToByteArray());
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Stored upload could not be read (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}
