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

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
