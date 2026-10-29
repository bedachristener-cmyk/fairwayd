import 'dotenv/config';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { copyLegacyTripDocumentToPrivate } from '../src/storage/r2.service';

async function main() {
  const apply = process.argv.includes('--apply');
  if (!apply && !process.argv.includes('--dry-run')) {
    console.log('Dry-run is the default. Pass --apply to copy and update records.');
  }
  const prisma = new PrismaService();
  let migrated = 0;
  let failed = 0;
  try {
    const docs = await prisma.tripDocument.findMany({
      where: {
        OR: [
          { fileUrl: { startsWith: 'http' } },
          { fileUrl: { startsWith: 'r2://' } },
          { fileUrl: { startsWith: 'trips/' } },
        ],
      },
      select: { id: true, tripId: true, fileUrl: true, fileName: true, mimeType: true },
      orderBy: { id: 'asc' },
    });
    console.log(`${apply ? 'Apply' : 'Dry-run'}: found ${docs.length} legacy Trip document reference(s).`);
    for (const doc of docs) {
      if (doc.fileUrl.startsWith('r2://private-trip-documents/')) continue;
      const digest = createHash('sha256').update(`${doc.id}\0${doc.fileUrl}`).digest('hex');
      const ext = extname(doc.fileName || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
      const key = `private-trip-documents/trips/${doc.tripId}/documents/${doc.id}/legacy-${digest}${ext}`;
      if (!apply) {
        console.log(`DRY-RUN document=${doc.id} action=copy-then-update target=${key}`);
        continue;
      }
      try {
        const privateReference = await copyLegacyTripDocumentToPrivate(doc.fileUrl, key, doc.mimeType);
        const updated = await prisma.tripDocument.updateMany({
          where: { id: doc.id, fileUrl: doc.fileUrl },
          data: { fileUrl: privateReference },
        });
        if (updated.count !== 1) throw new Error('record changed during migration');
        migrated += 1;
        console.log(`OK document=${doc.id} action=copied-verified-reference-updated`);
      } catch (error: any) {
        failed += 1;
        // Never print the source URL or an error message that may embed it.
        console.error(`FAIL document=${doc.id} code=${error?.name || 'Error'}`);
      }
    }
    console.log(`Summary: migrated=${migrated} failed=${failed} source_objects_deleted=0`);
    if (failed) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Migration stopped: ${error?.message || 'unknown error'}`);
  process.exitCode = 1;
});
