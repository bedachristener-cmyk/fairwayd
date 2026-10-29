import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  REVIEWED_AT_COORDINATE_BATCH,
  validateReviewedAtCoordinateBatch,
} from '../src/courses/reviewed-at-course-coordinate-batch';

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
  '--confirm-reviewed-at-course-coordinates',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-at-course-coordinates');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-at-course-coordinates is only valid with --apply',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

function coordinatesMatch(
  actualLat: number,
  actualLon: number,
  expectedLat: number,
  expectedLon: number,
): boolean {
  return (
    Math.abs(actualLat - expectedLat) <= 1e-8 &&
    Math.abs(actualLon - expectedLon) <= 1e-8
  );
}

async function main() {
  const definitionErrors = validateReviewedAtCoordinateBatch();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed AT coordinate batch: ${definitionErrors.join('; ')}`,
    );
  }

  const activeBefore = await prisma.course.count({
    where: { country: 'AT', active: true },
  });

  const plans: Array<{
    definition: (typeof REVIEWED_AT_COORDINATE_BATCH)[number];
    course: {
      id: string;
      name: string;
      country: string;
      lat: number;
      lon: number;
      active: boolean;
      verified: boolean;
      source: string | null;
    };
    action: 'update' | 'already-applied';
    distanceKm: number;
  }> = [];

  for (const definition of REVIEWED_AT_COORDINATE_BATCH) {
    const course = await prisma.course.findUnique({
      where: { id: definition.id },
      select: {
        id: true,
        name: true,
        country: true,
        lat: true,
        lon: true,
        active: true,
        verified: true,
        source: true,
      },
    });

    if (!course) {
      throw new Error(`Expected course is missing: id=${definition.id}`);
    }
    if (course.country !== 'AT') {
      throw new Error(
        `Country changed for id=${course.id}: expected AT, found ${course.country}`,
      );
    }
    if (course.name !== definition.name) {
      throw new Error(
        `Name changed for id=${course.id}: expected "${definition.name}", found "${course.name}"`,
      );
    }
    if (!course.active) {
      throw new Error(
        `Reviewed coordinate course is inactive: id=${course.id} name="${course.name}"`,
      );
    }

    const atCurrent = coordinatesMatch(
      course.lat,
      course.lon,
      definition.currentLat,
      definition.currentLon,
    );
    const atNew = coordinatesMatch(
      course.lat,
      course.lon,
      definition.newLat,
      definition.newLon,
    );
    if (!atCurrent && !atNew) {
      throw new Error(
        `Coordinates changed since review for id=${course.id} name="${course.name}": found ${course.lat},${course.lon}`,
      );
    }

    plans.push({
      definition,
      course,
      action: atNew ? 'already-applied' : 'update',
      distanceKm: courseDistanceKm(
        { lat: definition.currentLat, lon: definition.currentLon },
        { lat: definition.newLat, lon: definition.newLon },
      ),
    });
  }

  const updateCount = plans.filter((plan) => plan.action === 'update').length;
  const alreadyAppliedCount = plans.length - updateCount;
  console.log(
    `Preflight reviewed=${plans.length} update=${updateCount} already_applied=${alreadyAppliedCount} active_AT=${activeBefore}`,
  );

  for (const plan of plans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} name="${plan.course.name}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.newLat},${plan.definition.newLon} distance_km=${plan.distanceKm.toFixed(2)} google="${plan.definition.displayName}"`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run reviewed=${plans.length} update=${updateCount} already_applied=${alreadyAppliedCount} active_AT=${activeBefore} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-at-course-coordinates-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        reviewed: plans.map((plan) => ({
          action: plan.action,
          distanceKm: plan.distanceKm,
          previous: plan.course,
          reviewed: plan.definition,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let updated = 0;
  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.action !== 'update') continue;

      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          lat: plan.definition.newLat,
          lon: plan.definition.newLon,
          source: 'manual_review_google_places',
          verified: true,
        },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Course"
        SET "location" = ST_SetSRID(
          ST_MakePoint(${plan.definition.newLon}, ${plan.definition.newLat}),
          4326
        )::geography
        WHERE "id" = ${plan.course.id}
      `);
      updated++;
    }

    const transactionActiveAfter = await tx.course.count({
      where: { country: 'AT', active: true },
    });
    if (transactionActiveAfter !== activeBefore) {
      throw new Error(
        `Postflight active AT count mismatch: expected ${activeBefore}, found ${transactionActiveAfter}`,
      );
    }
    return transactionActiveAfter;
  });

  console.log(
    `Summary: mode=apply reviewed=${plans.length} updated=${updated} active_AT=${activeAfter}`,
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
