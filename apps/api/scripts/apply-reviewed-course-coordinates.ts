import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ApprovedCoordinateChange,
  parseApprovedCoordinateChange,
  ReviewedCoordinateInput,
} from '../src/courses/reviewed-course-coordinate';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function coordinatesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-8;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(
      [
        'Usage:',
        '  npx ts-node scripts/apply-reviewed-course-coordinates.ts <review.csv> --country XX',
        '  npx ts-node scripts/apply-reviewed-course-coordinates.ts <review.csv> --country XX --apply --confirm-reviewed-course-coordinates',
        '',
        'Only rows with reviewDecision=APPROVE are eligible.',
        'Without --apply the command is a read-only dry-run.',
      ].join('\n'),
    );
    return;
  }

  const fileArg = process.argv[2];
  const country = (argumentValue('--country') || '').trim().toUpperCase();
  const apply = process.argv.includes('--apply');
  const confirmed = process.argv.includes(
    '--confirm-reviewed-course-coordinates',
  );

  if (!fileArg) throw new Error('Review CSV path is required');
  if (!country) throw new Error('--country requires an ISO country code');
  if (apply && !confirmed) {
    throw new Error(
      '--apply requires --confirm-reviewed-course-coordinates',
    );
  }
  if (!apply && confirmed) {
    throw new Error(
      '--confirm-reviewed-course-coordinates is only valid with --apply',
    );
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Review CSV not found: ${filePath}`);
  }

  const rows = parse(fs.readFileSync(filePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as ReviewedCoordinateInput[];

  const approved: ApprovedCoordinateChange[] = [];
  const invalid: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const result = parseApprovedCoordinateChange(row, country);
    if (result.kind === 'approved') approved.push(result.change);
    if (result.kind === 'skipped') skipped++;
    if (result.kind === 'invalid') {
      invalid.push(
        `row=${index + 2} id=${row.id || '<missing>'} reason=${result.reason}`,
      );
    }
  });

  if (invalid.length > 0) {
    console.error('Preflight failed: invalid reviewed rows');
    invalid.forEach((message) => console.error(`- ${message}`));
    process.exitCode = 1;
    return;
  }

  const duplicateIds = approved
    .map((change) => change.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate approved course IDs: ${[...new Set(duplicateIds)].join(', ')}`,
    );
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter, log: ['error'] });

  try {
    const applicable: ApprovedCoordinateChange[] = [];
    const preflightErrors: string[] = [];

    for (const change of approved) {
      const current = await prisma.course.findUnique({
        where: { id: change.id },
        select: {
          id: true,
          country: true,
          name: true,
          lat: true,
          lon: true,
          active: true,
        },
      });

      if (!current) {
        preflightErrors.push(`id=${change.id} course not found`);
        continue;
      }
      if (!current.active) {
        preflightErrors.push(`id=${change.id} course is inactive`);
        continue;
      }
      if (current.country.toUpperCase() !== country) {
        preflightErrors.push(
          `id=${change.id} database country=${current.country} expected=${country}`,
        );
        continue;
      }
      if (current.name !== change.name) {
        preflightErrors.push(
          `id=${change.id} name changed: csv="${change.name}" db="${current.name}"`,
        );
        continue;
      }
      if (
        !coordinatesMatch(current.lat, change.currentLat) ||
        !coordinatesMatch(current.lon, change.currentLon)
      ) {
        preflightErrors.push(
          `id=${change.id} database coordinates changed since review`,
        );
        continue;
      }
      applicable.push(change);
    }

    if (preflightErrors.length > 0) {
      console.error('Preflight failed: database state mismatch');
      preflightErrors.forEach((message) => console.error(`- ${message}`));
      process.exitCode = 1;
      return;
    }

    console.log(
      `Preflight: rows=${rows.length} approved=${approved.length} skipped=${skipped} applicable=${applicable.length}`,
    );

    for (const change of applicable) {
      console.log(
        `${apply ? 'APPLY' : 'DRY-RUN'} id=${change.id} name="${change.name}" from=${change.currentLat},${change.currentLon} to=${change.newLat},${change.newLon}`,
      );
    }

    if (!apply) {
      console.log(
        `Summary: mode=dry-run approved=${approved.length} applicable=${applicable.length} updated=0`,
      );
      return;
    }

    const manifestDir = path.resolve('course-coordinate-manifests');
    fs.mkdirSync(manifestDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const manifestPath = path.join(
      manifestDir,
      `course-coordinate-changes-${country.toLowerCase()}-${timestamp}.json`,
    );
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          country,
          sourceFile: path.basename(filePath),
          changes: applicable,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    console.log(`Manifest written: ${manifestPath}`);

    await prisma.$transaction(async (tx) => {
      for (const change of applicable) {
        const updated = await tx.$executeRaw(Prisma.sql`
          UPDATE "Course"
          SET
            "lat" = ${change.newLat},
            "lon" = ${change.newLon},
            "location" = ST_SetSRID(
              ST_MakePoint(${change.newLon}, ${change.newLat}),
              4326
            )::geography,
            "verified" = true,
            "source" = 'google_places_reviewed',
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE
            "id" = ${change.id}
            AND "country" = ${country}
            AND "lat" = ${change.currentLat}
            AND "lon" = ${change.currentLon}
        `);

        if (updated !== 1) {
          throw new Error(
            `Optimistic update failed for course id=${change.id}`,
          );
        }
      }
    });

    console.log(
      `Summary: mode=apply approved=${approved.length} updated=${applicable.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
