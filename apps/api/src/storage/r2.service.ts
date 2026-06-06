import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, normalize, sep } from 'path';

function isProduction() {
  return process.env.NODE_ENV === 'production';
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

  if (!hasR2Config) {
    if (!isProduction()) {
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

    if (!isProduction()) {
      console.warn('[storage] Using local upload fallback after R2 failure', {
        key,
        contentType,
        bytes: buffer.length,
      });
      return writeLocalUpload(key, buffer);
    }

    throw err;
  }

  const publicUrl = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (!publicUrl) return key;
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
