import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  GOLF_EMMENTAL,
  isExpectedLangenthalDuplicate,
  LANGENTHAL_DUPLICATE,
  validateGolfEmmentalDefinition,
} from '../src/courses/reviewed-ch-course-correction';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-ch-course-corrections',
);

if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-ch-course-corrections',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-ch-course-corrections is only valid with --apply',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

function coordinateMatches(
  lat: number,
  lon: number,
  expectedLat: number,
  expectedLon: number,
): boolean {
  return (
    Math.abs(lat - expectedLat) <= 1e-8 &&
    Math.abs(lon - expectedLon) <= 1e-8
  );
}

async function main() {
  const definitionErrors = validateGolfEmmentalDefinition();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid Golf Emmental definition: ${definitionErrors.join('; ')}`,
    );
  }

  const langenthalMatches = await prisma.course.findMany({
    where: {
      country: LANGENTHAL_DUPLICATE.country,
      name: LANGENTHAL_DUPLICATE.name,
    },
    select: {
      id: true,
      country: true,
      name: true,
      lat: true,
      lon: true,
      active: true,
      _count: {
        select: {
          followers: true,
          ratings: true,
          posts: true,
          reviews: true,
          tripItems: true,
        },
      },
    },
  });

  if (langenthalMatches.length !== 1) {
    throw new Error(
      `Expected exactly one Golf Club Langenthal row, found ${langenthalMatches.length}`,
    );
  }

  const langenthal = langenthalMatches[0];
  if (!isExpectedLangenthalDuplicate(langenthal)) {
    throw new Error(
      'Golf Club Langenthal no longer matches the reviewed coordinates',
    );
  }

  const limpachtal = await prisma.course.findFirst({
    where: {
      country: 'CH',
      name: 'Golf Limpachtal',
      active: true,
    },
    select: { id: true, lat: true, lon: true },
  });

  if (
    !limpachtal ||
    !coordinateMatches(
      limpachtal.lat,
      limpachtal.lon,
      LANGENTHAL_DUPLICATE.currentLat,
      LANGENTHAL_DUPLICATE.currentLon,
    )
  ) {
    throw new Error(
      'Active Golf Limpachtal at the reviewed duplicate coordinates was not found',
    );
  }

  const emmentalMatches = await prisma.course.findMany({
    where: {
      country: GOLF_EMMENTAL.country,
      name: GOLF_EMMENTAL.name,
    },
    select: {
      id: true,
      lat: true,
      lon: true,
      active: true,
      holes: true,
      par: true,
    },
  });

  if (emmentalMatches.length > 1) {
    throw new Error(
      `Expected at most one Golf Emmental row, found ${emmentalMatches.length}`,
    );
  }

  const existingEmmental = emmentalMatches[0];
  if (
    existingEmmental &&
    (!coordinateMatches(
      existingEmmental.lat,
      existingEmmental.lon,
      GOLF_EMMENTAL.lat,
      GOLF_EMMENTAL.lon,
    ) ||
      existingEmmental.holes !== GOLF_EMMENTAL.holes ||
      existingEmmental.par !== GOLF_EMMENTAL.par)
  ) {
    throw new Error(
      'Existing Golf Emmental does not match the reviewed definition',
    );
  }

  const activeSwissCourses = await prisma.course.findMany({
    where: { country: 'CH', active: true },
    select: { id: true, name: true, lat: true, lon: true },
  });
  const coordinateCollision = activeSwissCourses.find(
    (course) =>
      course.id !== existingEmmental?.id &&
      coordinateMatches(
        course.lat,
        course.lon,
        GOLF_EMMENTAL.lat,
        GOLF_EMMENTAL.lon,
      ),
  );

  if (coordinateCollision) {
    throw new Error(
      `Golf Emmental coordinates already belong to id=${coordinateCollision.id} name="${coordinateCollision.name}"`,
    );
  }

  const dependencyCounts = langenthal._count;
  const totalDependencies = Object.values(dependencyCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  console.log(
    `Preflight: langenthal_id=${langenthal.id} active=${langenthal.active} dependencies=${totalDependencies} limpachtal_id=${limpachtal.id}`,
  );
  console.log(
    `Preflight: golf_emmental=${existingEmmental ? `existing id=${existingEmmental.id} active=${existingEmmental.active}` : 'missing'}`,
  );
  console.log(
    `${apply ? 'APPLY' : 'DRY-RUN'} action=${langenthal.active ? 'deactivate' : 'already-inactive'} id=${langenthal.id} name="${langenthal.name}"`,
  );
  console.log(
    `${apply ? 'APPLY' : 'DRY-RUN'} action=${existingEmmental ? 'already-present' : 'create'} name="${GOLF_EMMENTAL.name}" coordinates=${GOLF_EMMENTAL.lat},${GOLF_EMMENTAL.lon}`,
  );

  if (!apply) {
    console.log(
      `Summary: mode=dry-run langenthal=${langenthal.active ? 'would-deactivate' : 'already-inactive'} golf_emmental=${existingEmmental ? 'already-present' : 'would-create'} updated=0 created=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-ch-course-corrections-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        langenthal: {
          id: langenthal.id,
          action: langenthal.active ? 'deactivate' : 'already-inactive',
          coordinates: {
            lat: langenthal.lat,
            lon: langenthal.lon,
          },
          dependencyCounts,
        },
        limpachtal: {
          id: limpachtal.id,
          coordinates: {
            lat: limpachtal.lat,
            lon: limpachtal.lon,
          },
        },
        golfEmmental: {
          action: existingEmmental ? 'already-present' : 'create',
          existingId: existingEmmental?.id ?? null,
          definition: GOLF_EMMENTAL,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let createdId: string | null = existingEmmental?.id ?? null;
  await prisma.$transaction(async (tx) => {
    if (langenthal.active) {
      await tx.course.update({
        where: { id: langenthal.id },
        data: {
          active: false,
          source: 'manual_review_deactivated_duplicate',
        },
      });
    }

    if (!existingEmmental) {
      const created = await tx.course.create({
        data: {
          name: GOLF_EMMENTAL.name,
          country: GOLF_EMMENTAL.country,
          region: GOLF_EMMENTAL.region,
          city: GOLF_EMMENTAL.city,
          postalCode: GOLF_EMMENTAL.postalCode,
          lat: GOLF_EMMENTAL.lat,
          lon: GOLF_EMMENTAL.lon,
          holes: GOLF_EMMENTAL.holes,
          par: GOLF_EMMENTAL.par,
          phone: GOLF_EMMENTAL.phone,
          website: GOLF_EMMENTAL.website,
          source: GOLF_EMMENTAL.source,
          verified: GOLF_EMMENTAL.verified,
          active: GOLF_EMMENTAL.active,
        },
        select: { id: true },
      });
      createdId = created.id;

      await tx.$executeRaw(Prisma.sql`
        UPDATE "Course"
        SET "location" = ST_SetSRID(
          ST_MakePoint(${GOLF_EMMENTAL.lon}, ${GOLF_EMMENTAL.lat}),
          4326
        )::geography
        WHERE "id" = ${created.id}
      `);
    }
  });

  console.log(
    `Summary: mode=apply langenthal=${langenthal.active ? 'deactivated' : 'already-inactive'} golf_emmental=${existingEmmental ? 'already-present' : `created id=${createdId}`}`,
  );
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
