import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS,
  validateReviewedAtDirectoryCourseReconciliation,
} from '../src/courses/reviewed-at-directory-course-reconciliation';

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
  '--confirm-reviewed-at-directory-course-reconciliation',
);

if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-at-directory-course-reconciliation',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-at-directory-course-reconciliation is only valid with --apply',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

const courseSelect = {
  id: true,
  name: true,
  country: true,
  city: true,
  region: true,
  postalCode: true,
  holes: true,
  website: true,
  lat: true,
  lon: true,
  active: true,
  verified: true,
  source: true,
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

async function main() {
  const definitionErrors =
    validateReviewedAtDirectoryCourseReconciliation();

  for (
    let index = 0;
    index < REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.length;
    index++
  ) {
    const course = REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS[index];
    for (
      let otherIndex = index + 1;
      otherIndex < REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.length;
      otherIndex++
    ) {
      const other =
        REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS[otherIndex];
      if (courseDistanceKm(course, other) <= 0.05) {
        definitionErrors.push(
          `reviewed additions within 50m: "${course.name}" and "${other.name}"`,
        );
      }
    }
  }

  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed AT directory reconciliation: ${definitionErrors.join('; ')}`,
    );
  }

  const existingCourses = await prisma.course.findMany({
    where: { country: 'AT' },
    select: courseSelect,
  });
  const activeBefore = existingCourses.filter((course) => course.active).length;

  const plans: Array<{
    existing: LoadedCourse | null;
    definition:
      (typeof REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS)[number];
    action: 'create' | 'reactivate' | 'already-present';
  }> = [];

  for (const definition of REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS) {
    const sameName = existingCourses.filter(
      (course) =>
        course.name.toLocaleLowerCase() ===
        definition.name.toLocaleLowerCase(),
    );

    if (sameName.length > 1) {
      throw new Error(
        `Expected at most one AT row for "${definition.name}", found ${sameName.length}`,
      );
    }

    const existing = sameName[0] ?? null;
    if (
      existing &&
      (!coordinatesMatch(
        existing.lat,
        existing.lon,
        definition.lat,
        definition.lon,
      ) ||
        existing.holes !== definition.holes)
    ) {
      throw new Error(
        `Existing course does not match reviewed definition: "${definition.name}" id=${existing.id}`,
      );
    }

    const nearbyCollision = existingCourses.find(
      (course) =>
        course.active &&
        course.id !== existing?.id &&
        courseDistanceKm(course, definition) <= 0.05,
    );
    if (nearbyCollision) {
      throw new Error(
        `Reviewed addition "${definition.name}" is within 50m of active id=${nearbyCollision.id} name="${nearbyCollision.name}"; review as one facility`,
      );
    }

    plans.push({
      existing,
      definition,
      action: !existing
        ? 'create'
        : existing.active
          ? 'already-present'
          : 'reactivate',
    });
  }

  const createCount = plans.filter((plan) => plan.action === 'create').length;
  const reactivateCount = plans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const alreadyPresentCount =
    plans.length - createCount - reactivateCount;
  const expectedActiveAfter =
    activeBefore + createCount + reactivateCount;

  console.log(
    `Preflight additions=${plans.length} create=${createCount} reactivate=${reactivateCount} already_present=${alreadyPresentCount}`,
  );
  console.log(
    `Preflight active_AT_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: one marker per physical golf facility; separate physical sites remain separate.',
  );

  for (const plan of plans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes} source="${plan.definition.coordinateSource}"`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run additions=${plans.length} create=${createCount} reactivate=${reactivateCount} already_present=${alreadyPresentCount} active_AT_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-at-directory-course-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        expectedActiveAfter,
        plans,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let created = 0;
  let reactivated = 0;

  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.action === 'already-present') continue;

      let courseId: string;
      if (plan.action === 'reactivate' && plan.existing) {
        await tx.course.update({
          where: { id: plan.existing.id },
          data: {
            city: plan.definition.city,
            region: plan.definition.region,
            postalCode: plan.definition.postalCode,
            holes: plan.definition.holes,
            website: plan.definition.website,
            lat: plan.definition.lat,
            lon: plan.definition.lon,
            source: 'manual_review_missing_course',
            verified: true,
            active: true,
          },
        });
        courseId = plan.existing.id;
        reactivated++;
      } else {
        const inserted = await tx.course.create({
          data: {
            name: plan.definition.name,
            country: 'AT',
            city: plan.definition.city,
            region: plan.definition.region,
            postalCode: plan.definition.postalCode,
            holes: plan.definition.holes,
            website: plan.definition.website,
            lat: plan.definition.lat,
            lon: plan.definition.lon,
            source: 'manual_review_missing_course',
            verified: true,
            active: true,
          },
          select: { id: true },
        });
        courseId = inserted.id;
        created++;
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "Course"
        SET "location" = ST_SetSRID(
          ST_MakePoint(${plan.definition.lon}, ${plan.definition.lat}),
          4326
        )::geography
        WHERE "id" = ${courseId}
      `);
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
    `Summary: mode=apply created=${created} reactivated=${reactivated} active_AT=${activeAfter}`,
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
