import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  auditCourseCoordinates,
  CourseCoordinateRecord,
} from '../src/courses/course-coordinate-audit';

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
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function mapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lon}`,
  )}`;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: npx ts-node scripts/audit-course-coordinates.ts [--country XX]',
    );
    return;
  }

  const countryArg = argumentValue('--country');
  const country = countryArg?.trim().toUpperCase();

  if (process.argv.includes('--country') && !country) {
    throw new Error('--country requires a non-empty ISO country code');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter, log: ['error'] });

  try {
    const courses = await prisma.course.findMany({
      where: {
        active: true,
        ...(country ? { country } : {}),
      },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        country: true,
        name: true,
        city: true,
        region: true,
        lat: true,
        lon: true,
        verified: true,
        source: true,
        osmId: true,
      },
    });

    const records: CourseCoordinateRecord[] = courses.map((course) => ({
      id: course.id,
      country: course.country,
      lat: course.lat,
      lon: course.lon,
      verified: course.verified,
      source: course.source,
    }));
    const audit = auditCourseCoordinates(records);

    const outputDir = path.resolve('course-audits');
    fs.mkdirSync(outputDir, { recursive: true });
    const scope = country?.toLowerCase() || 'all';
    const summaryPath = path.join(
      outputDir,
      `course-coordinate-summary-${scope}.json`,
    );
    const detailPath = path.join(
      outputDir,
      `course-coordinate-details-${scope}.csv`,
    );

    fs.writeFileSync(
      summaryPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          scope: country || 'ALL',
          activeCourses: courses.length,
          countries: audit.summaries,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const columns = [
      'id',
      'country',
      'name',
      'city',
      'region',
      'lat',
      'lon',
      'verified',
      'source',
      'osmId',
      'validRange',
      'zeroIsland',
      'sharedCoordinate',
      'reviewRecommended',
      'mapUrl',
    ] as const;

    const rows = courses.map((course) => {
      const flags = audit.flagsById.get(course.id);
      const reviewRecommended =
        !course.verified ||
        !flags?.validRange ||
        flags.zeroIsland ||
        flags.sharedCoordinate;

      const values: Record<(typeof columns)[number], unknown> = {
        ...course,
        validRange: flags?.validRange ?? false,
        zeroIsland: flags?.zeroIsland ?? false,
        sharedCoordinate: flags?.sharedCoordinate ?? false,
        reviewRecommended,
        mapUrl: mapsUrl(course.lat, course.lon),
      };
      return columns.map((column) => csvCell(values[column])).join(',');
    });

    fs.writeFileSync(
      detailPath,
      `${columns.join(',')}\n${rows.join('\n')}\n`,
      'utf8',
    );

    console.log(
      `Read-only audit: active=${courses.length} countries=${audit.summaries.length}`,
    );
    for (const summary of audit.summaries) {
      console.log(
        [
          summary.country,
          `active=${summary.active}`,
          `verified=${summary.verified}`,
          `unverified=${summary.unverified}`,
          `invalid-range=${summary.invalidRange}`,
          `zero=${summary.zeroIsland}`,
          `shared-coordinate=${summary.sharedCoordinateCourses}`,
        ].join(' '),
      );
    }
    console.log(`Summary: ${summaryPath}`);
    console.log(`Details: ${detailPath}`);
    console.log('Accuracy verification: not performed (range and duplicate checks only)');
    console.log('Database changes: 0');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
