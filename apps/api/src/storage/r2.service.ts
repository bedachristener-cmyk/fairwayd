import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
console.log('R2_ENDPOINT =', process.env.R2_ENDPOINT);
console.log('R2_BUCKET =', process.env.R2_BUCKET);
console.log('R2_PUBLIC_URL =', process.env.R2_PUBLIC_URL);
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const bucket = process.env.R2_BUCKET || '';

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
