import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const endpoint = process.env.R2_ENDPOINT || '';
  const bucket = process.env.R2_BUCKET || '';

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

  await client.send(command);

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
