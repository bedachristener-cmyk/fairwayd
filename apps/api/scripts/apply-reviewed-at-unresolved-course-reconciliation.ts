import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES,
  REVIEWED_AT_UNRESOLVED_INVALID_RECORDS,
  validateReviewedAtUnresolvedCourseReconciliation,
} from '../src/courses/reviewed-at-unresolved-course-reconciliation';

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
  '--confirm-reviewed-at-unresolved-course-reconciliation',
);

if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-at-unresolved-course-reconciliation',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-at-unresolved-course-reconciliation is only valid with --apply',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

const courseSelect = {
  id: true,
  name: true,
  country: true,
  lat: true,
  lon: true,
  active: true,
  verified: true,
  source: true,
  _count: {
    select: {
      followers: true,
      ratings: true,
      posts: true,
      reviews: true,
      tripItems: true,
    },
  },
} satisfies Prisma.CourseSelect;

type LoadedCourse = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;

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

function dependencyTotal(course: LoadedCourse): number {
  return Object.values(course._count).reduce(
    (sum, count) => sum + count,
    0,
  );
}

async function loadCourse(id: string): Promise<LoadedCourse> {
  const course = await prisma.course.findUnique({
    where: { id },
    select: courseSelect,
  });
  if (!course) throw new Error(`Expected course is missing: id=${id}`);
  if (course.country !== 'AT') {
    throw new Error(
      `Country changed for id=${id}: expected AT, found ${course.country}`,
    );
  }
  return course;
}

async function main() {
  const definitionErrors =
    validateReviewedAtUnresolvedCourseReconciliation();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed AT unresolved-course reconciliation: ${definitionErrors.join('; ')}`,
    );
  }

  const activeBefore = await prisma.course.count({
    where: { country: 'AT', active: true },
  });

  const updatePlans: Array<{
    definition: (typeof REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES)[number];
    course: LoadedCourse;
    action: 'update' | 'already-applied';
    distanceKm: number;
  }> = [];

  for (const definition of REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES) {
    const course = await loadCourse(definition.id);
    if (!course.active) {
      throw new Error(
        `Reviewed course is inactive: id=${course.id} name="${course.name}"`,
      );
    }

    const atOriginal =
      course.name === definition.currentName &&
      coordinatesMatch(
        course.lat,
        course.lon,
        definition.currentLat,
        definition.currentLon,
      );
    const atReviewed =
      course.name === definition.targetName &&
      coordinatesMatch(
        course.lat,
        course.lon,
        definition.newLat,
        definition.newLon,
      );

    if (!atOriginal && !atReviewed) {
      throw new Error(
        `Course changed since review: id=${course.id} expected original "${definition.currentName}" at ${definition.currentLat},${definition.currentLon} or reviewed "${definition.targetName}" at ${definition.newLat},${definition.newLon}; found "${course.name}" at ${course.lat},${course.lon}`,
      );
    }

    const collision = await prisma.course.findFirst({
      where: {
        id: { not: course.id },
        country: 'AT',
        active: true,
        name: definition.targetName,
      },
      select: { id: true, name: true, lat: true, lon: true },
    });
    if (collision) {
      throw new Error(
        `Active target-name collision for "${definition.targetName}": id=${collision.id} coordinates=${collision.lat},${collision.lon}`,
      );
    }

    const fullyApplied =
      atReviewed &&
      course.verified &&
      course.source === 'manual_review_regional_tourism';

    updatePlans.push({
      definition,
      course,
      action: fullyApplied ? 'already-applied' : 'update',
      distanceKm: courseDistanceKm(
        { lat: definition.currentLat, lon: definition.currentLon },
        { lat: definition.newLat, lon: definition.newLon },
      ),
    });
  }

  const invalidPlans: Array<{
    definition: (typeof REVIEWED_AT_UNRESOLVED_INVALID_RECORDS)[number];
    course: LoadedCourse;
    action: 'deactivate' | 'already-inactive';
  }> = [];

  for (const definition of REVIEWED_AT_UNRESOLVED_INVALID_RECORDS) {
    const course = await loadCourse(definition.id);
    if (
      course.name !== definition.name ||
      !coordinatesMatch(
        course.lat,
        course.lon,
        definition.lat,
        definition.lon,
      )
    ) {
      throw new Error(
        `Invalid-record candidate changed since review: id=${course.id} expected "${definition.name}" at ${definition.lat},${definition.lon}; found "${course.name}" at ${course.lat},${course.lon}`,
      );
    }

    invalidPlans.push({
      definition,
      course,
      action: course.active ? 'deactivate' : 'already-inactive',
    });
  }

  const updateCount = updatePlans.filter(
    (plan) => plan.action === 'update',
  ).length;
  const alreadyAppliedCount = updatePlans.length - updateCount;
  const deactivateCount = invalidPlans.filter(
    (plan) => plan.action === 'deactivate',
  ).length;
  const expectedActiveAfter = activeBefore - deactivateCount;

  console.log(
    `Preflight reviewed=${updatePlans.length} update=${updateCount} already_applied=${alreadyAppliedCount} invalid=${invalidPlans.length} deactivate=${deactivateCount} active_AT_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );

  for (const plan of updatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.targetName}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.newLat},${plan.definition.newLon} distance_km=${plan.distanceKm.toFixed(2)} source="${plan.definition.coordinateSource}"`,
    );
  }
  for (const plan of invalidPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} name="${plan.course.name}" dependencies=${dependencyTotal(plan.course)} reason=${plan.definition.reason}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run reviewed=${updatePlans.length} update=${updateCount} already_applied=${alreadyAppliedCount} invalid=${invalidPlans.length} deactivate=${deactivateCount} active_AT_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const blocked = invalidPlans.filter(
    (plan) =>
      plan.action === 'deactivate' && dependencyTotal(plan.course) > 0,
  );
  if (blocked.length > 0) {
    throw new Error(
      `Apply blocked: dependencies must be reviewed before deactivation: ${blocked
        .map(
          (plan) =>
            `${plan.course.name}=${dependencyTotal(plan.course)}`,
        )
        .join(', ')}`,
    );
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-at-unresolved-course-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        expectedActiveAfter,
        reviewedUpdates: updatePlans.map((plan) => ({
          action: plan.action,
          distanceKm: plan.distanceKm,
          previous: plan.course,
          reviewed: plan.definition,
        })),
        invalidRecords: invalidPlans.map((plan) => ({
          action: plan.action,
          dependencyTotal: dependencyTotal(plan.course),
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
  let deactivated = 0;
  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of updatePlans) {
      if (plan.action !== 'update') continue;

      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          name: plan.definition.targetName,
          lat: plan.definition.newLat,
          lon: plan.definition.newLon,
          source: 'manual_review_regional_tourism',
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

    for (const plan of invalidPlans) {
      if (plan.action !== 'deactivate') continue;
      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          active: false,
          source: 'manual_review_deactivated_invalid_record',
        },
      });
      deactivated++;
    }

    const transactionActiveAfter = await tx.course.count({
      where: { country: 'AT', active: true },
    });
    if (transactionActiveAfter !== expectedActiveAfter) {
      throw new Error(
        `Postflight active AT count mismatch: expected ${expectedActiveAfter}, found ${transactionActiveAfter}`,
      );
    }
    return transactionActiveAfter;
  });

  console.log(
    `Summary: mode=apply reviewed=${updatePlans.length} updated=${updated} deactivated=${deactivated} active_AT=${activeAfter}`,
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
