/*
 * One-off Stage data repair for the SunnyHills feed post image.
 *
 * Target postId: cmtd53l810001o0uwmoawlscp
 * Target PostImage.id: cmtd53l8r0002o0uw52mmqqjz
 *
 * This repairs exactly one legacy local /uploads/posts image URL by uploading
 * the original image bytes to the configured Stage R2 bucket, then updating
 * only the guarded PostImage row. Do not generalize this script or wire it
 * into normal startup/deploy flows.
 *
 * Dry-run is the default and performs no R2 or database writes.
 * Real repair requires: node scripts/repair-sunnyhills-post-image.js --execute
 */

require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const TARGET_POST_ID = 'cmtd53l810001o0uwmoawlscp';
const TARGET_POST_IMAGE_ID = 'cmtd53l8r0002o0uw52mmqqjz';
const OLD_URL =
  '/uploads/posts/cmltnknlo00001wp7uyaqzaec-1787932923452-0.png';
const R2_KEY = 'posts/cmltnknlo00001wp7uyaqzaec-1787932923452-0.png';
const LOCAL_IMAGE_PATH = path.resolve(
  __dirname,
  '..',
  'uploads',
  'posts',
  'cmltnknlo00001wp7uyaqzaec-1787932923452-0.png',
);
const IMAGE_SHA256 =
  'a3fc4cd38a497bb1b93f7cd141345dea7f976207b12b152e67cc2be6ccdd1a11';
const IMAGE_BYTES = 10623;

const execute = process.argv.includes('--execute');
const dryRun = !execute;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function buildPublicUrl(publicBase, key) {
  const trimmed = publicBase.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('R2_PUBLIC_URL is empty');
  if (trimmed.startsWith('//')) return `https:${trimmed}/${key}`;
  if (
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/|$)/i.test(trimmed)
  ) {
    return `https://${trimmed}/${key}`;
  }
  return `${trimmed}/${key}`;
}

function loadImageBuffer() {
  if (process.env.SUNNYHILLS_REPAIR_IMAGE_BASE64) {
    return {
      buffer: Buffer.from(process.env.SUNNYHILLS_REPAIR_IMAGE_BASE64, 'base64'),
      source: 'SUNNYHILLS_REPAIR_IMAGE_BASE64',
    };
  }

  if (fs.existsSync(LOCAL_IMAGE_PATH)) {
    return {
      buffer: fs.readFileSync(LOCAL_IMAGE_PATH),
      source: LOCAL_IMAGE_PATH,
    };
  }

  throw new Error(
    'Repair image is unavailable. Provide SUNNYHILLS_REPAIR_IMAGE_BASE64 or run from an environment with the local source image.',
  );
}

function contentTypeFor(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  throw new Error('Repair image is not a supported image type');
}

async function verifyPublicImage(url) {
  const head = await fetch(url, { method: 'HEAD' });
  const response = head.ok ? head : await fetch(url, { method: 'GET' });
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    throw new Error(`Public image verification failed: HTTP ${response.status}`);
  }
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(
      `Public image verification failed: unexpected content type ${contentType}`,
    );
  }

  return { status: response.status, contentType };
}

async function main() {
  const endpoint = requiredEnv('R2_ENDPOINT');
  const bucket = requiredEnv('R2_BUCKET');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  const publicUrlBase = requiredEnv('R2_PUBLIC_URL');
  const connectionString =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL is not set');
  }

  const { buffer: imageBuffer, source: imageSource } = loadImageBuffer();
  const imageHash = crypto
    .createHash('sha256')
    .update(imageBuffer)
    .digest('hex');

  if (imageBuffer.length !== IMAGE_BYTES || imageHash !== IMAGE_SHA256) {
    throw new Error('Repair image integrity check failed');
  }

  const contentType = contentTypeFor(imageBuffer);
  const finalUrl = buildPublicUrl(publicUrlBase, R2_KEY);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ['error'],
  });

  try {
    const image = await prisma.postImage.findUnique({
      where: { id: TARGET_POST_IMAGE_ID },
      select: { id: true, postId: true, url: true },
    });

    if (!image) {
      throw new Error(`PostImage row not found: ${TARGET_POST_IMAGE_ID}`);
    }
    if (image.postId !== TARGET_POST_ID) {
      throw new Error(
        `Guard failed: row postId is ${image.postId}, expected ${TARGET_POST_ID}`,
      );
    }

    if (image.url === finalUrl) {
      const verification = await verifyPublicImage(finalUrl);
      console.log('Repair already completed.');
      console.log(
        JSON.stringify(
          {
            dryRun,
            postImageId: TARGET_POST_IMAGE_ID,
            postId: TARGET_POST_ID,
            finalUrl,
            verification,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (image.url !== OLD_URL) {
      throw new Error(
        `Guard failed: row URL is unexpected; refusing to overwrite ${image.url}`,
      );
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          postImageId: TARGET_POST_IMAGE_ID,
          postId: TARGET_POST_ID,
          oldUrl: OLD_URL,
          finalUrl,
          r2Key: R2_KEY,
          imageSource,
          bytes: imageBuffer.length,
          sha256: imageHash,
          contentType,
        },
        null,
        2,
      ),
    );

    if (dryRun) {
      console.log('Dry-run complete. No R2 upload or database update performed.');
      return;
    }

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: R2_KEY,
        Body: imageBuffer,
        ContentType: contentType,
      }),
    );

    const verification = await verifyPublicImage(finalUrl);

    const updated = await prisma.postImage.updateMany({
      where: {
        id: TARGET_POST_IMAGE_ID,
        postId: TARGET_POST_ID,
        url: OLD_URL,
      },
      data: { url: finalUrl },
    });

    if (updated.count !== 1) {
      throw new Error(
        `Database update failed after R2 upload; expected 1 row, updated ${updated.count}. R2 object may already exist at ${finalUrl}`,
      );
    }

    const persisted = await prisma.postImage.findUnique({
      where: { id: TARGET_POST_IMAGE_ID },
      select: { id: true, postId: true, url: true },
    });

    if (persisted?.url !== finalUrl) {
      throw new Error('Persisted row verification failed after update');
    }

    const remainingLocalUrls = await prisma.postImage.count({
      where: { url: { startsWith: '/uploads/posts/' } },
    });

    console.log(
      JSON.stringify(
        {
          repaired: true,
          postImageId: TARGET_POST_IMAGE_ID,
          postId: TARGET_POST_ID,
          oldUrl: OLD_URL,
          finalUrl,
          verification,
          remainingLocalUrls,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
