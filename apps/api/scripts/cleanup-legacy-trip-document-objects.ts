import 'dotenv/config';
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { isLegacyTripDocumentObjectKey } from '../src/storage/legacy-trip-document-cleanup';

const PRIVATE_REFERENCE_PREFIX = 'r2://private-trip-documents/';
const LEGACY_PREFIX = 'trips/';
const CONFIRMATION_FLAG = '--confirm-delete-legacy-trip-documents';

function printHelp() {
  console.log(`Usage:
  npx ts-node scripts/cleanup-legacy-trip-document-objects.ts --dry-run
  npx ts-node scripts/cleanup-legacy-trip-document-objects.ts --apply ${CONFIRMATION_FLAG}

Dry-run is the default. Apply aborts unless every Trip document database
reference points at private-trip-documents and the confirmation flag is present.`);
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function referenceKind(fileUrl: string) {
  if (fileUrl.startsWith(PRIVATE_REFERENCE_PREFIX)) return 'private';
  if (/^https?:\/\//i.test(fileUrl)) return 'absolute-url';
  if (fileUrl.startsWith('r2://')) return 'shared-r2';
  if (fileUrl.startsWith('trips/')) return 'shared-key';
  return 'other';
}

async function listLegacyDocumentObjects(client: S3Client, bucket: string) {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: LEGACY_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    objects.push(
      ...(page.Contents ?? []).filter(
        (object): object is _Object & { Key: string } =>
          !!object.Key && isLegacyTripDocumentObjectKey(object.Key),
      ),
    );
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects.sort((left, right) => (left.Key ?? '').localeCompare(right.Key ?? ''));
}

async function writeManifest(objects: _Object[]) {
  const directory = join(process.cwd(), 'cleanup-manifests');
  await mkdir(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(directory, `legacy-trip-documents-${timestamp}.json`);
  await writeFile(
    path,
    `${JSON.stringify(
      objects.map((object) => ({
        key: object.Key,
        size: object.Size ?? null,
        etag: object.ETag ?? null,
        lastModified: object.LastModified?.toISOString() ?? null,
      })),
      null,
      2,
    )}\n`,
    'utf8',
  );
  return path;
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }

  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(`Apply requires ${CONFIRMATION_FLAG}`);
  }

  const endpoint = requiredEnv('R2_ENDPOINT');
  const bucket = requiredEnv('R2_BUCKET');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  const prisma = new PrismaService();

  try {
    const documents = await prisma.tripDocument.findMany({
      select: { id: true, fileUrl: true },
      orderBy: { id: 'asc' },
    });
    const unresolved = documents.filter(
      (document) => !document.fileUrl.startsWith(PRIVATE_REFERENCE_PREFIX),
    );

    console.log(
      `Preflight: documents=${documents.length} private=${documents.length - unresolved.length} unresolved=${unresolved.length}`,
    );
    if (unresolved.length > 0) {
      unresolved.forEach((document) =>
        console.error(
          `BLOCKED document=${document.id} reference=${referenceKind(document.fileUrl)}`,
        ),
      );
      throw new Error('Cleanup blocked by non-private Trip document references');
    }

    const candidates = await listLegacyDocumentObjects(client, bucket);
    console.log(
      `${apply ? 'Apply' : 'Dry-run'}: found ${candidates.length} legacy public Trip document object(s).`,
    );
    candidates.forEach((object) =>
      console.log(
        `${apply ? 'DELETE' : 'DRY-RUN'} key=${object.Key} bytes=${object.Size ?? 'unknown'}`,
      ),
    );

    if (!apply) {
      console.log(
        `Summary: candidates=${candidates.length} deleted=0. Re-run with --apply ${CONFIRMATION_FLAG} after review.`,
      );
      return;
    }

    const manifestPath = await writeManifest(candidates);
    console.log(`Manifest written: ${manifestPath}`);

    let deleted = 0;
    for (const object of candidates) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: object.Key,
        }),
      );
      deleted += 1;
      console.log(`OK key=${object.Key} action=deleted`);
    }

    const remaining = await listLegacyDocumentObjects(client, bucket);
    if (remaining.length > 0) {
      throw new Error(
        `Cleanup verification failed: ${remaining.length} legacy object(s) remain`,
      );
    }
    console.log(`Summary: candidates=${candidates.length} deleted=${deleted} remaining=0`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Cleanup stopped: ${error?.message || 'unknown error'}`);
    process.exitCode = 1;
  });
}
