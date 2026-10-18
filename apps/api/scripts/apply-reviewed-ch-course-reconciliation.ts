import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  REVIEWED_CH_DUPLICATES,
  REVIEWED_CH_RENAMES,
  validateReviewedChReconciliation,
} from '../src/courses/reviewed-ch-course-reconciliation';
import {
  REVIEWED_MISSING_CH_COURSES,
  validateReviewedMissingChCourses,
} from '../src/courses/reviewed-missing-ch-courses';

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
  '--confirm-reviewed-ch-course-reconciliation',
);

if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-ch-course-reconciliation',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-ch-course-reconciliation is only valid with --apply',
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
  lat: true,
  lon: true,
  holes: true,
  website: true,
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

async function findByName(name: string): Promise<LoadedCourse[]> {
  return prisma.course.findMany({
    where: { country: 'CH', name },
    select: courseSelect,
  });
}

async function main() {
  const definitionErrors = [
    ...validateReviewedMissingChCourses(),
    ...validateReviewedChReconciliation(),
  ];
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed CH reconciliation: ${definitionErrors.join('; ')}`,
    );
  }

  const activeBefore = await prisma.course.count({
    where: { country: 'CH', active: true },
  });

  const duplicatePlans: Array<{
    duplicate: LoadedCourse;
    canonical: LoadedCourse;
    action: 'deactivate' | 'already-inactive';
  }> = [];

  for (const definition of REVIEWED_CH_DUPLICATES) {
    const [duplicateMatches, canonicalMatches] = await Promise.all([
      findByName(definition.duplicateName),
      findByName(definition.canonicalName),
    ]);

    if (duplicateMatches.length !== 1 || canonicalMatches.length !== 1) {
      throw new Error(
        `Expected one duplicate and canonical row for "${definition.duplicateName}" -> "${definition.canonicalName}", found ${duplicateMatches.length}/${canonicalMatches.length}`,
      );
    }

    const duplicate = duplicateMatches[0];
    const canonical = canonicalMatches[0];
    if (!canonical.active) {
      throw new Error(
        `Canonical course is inactive: "${canonical.name}" id=${canonical.id}`,
      );
    }
    if (
      !coordinatesMatch(
        duplicate.lat,
        duplicate.lon,
        canonical.lat,
        canonical.lon,
      )
    ) {
      throw new Error(
        `Reviewed duplicate coordinates no longer match: "${duplicate.name}" and "${canonical.name}"`,
      );
    }

    duplicatePlans.push({
      duplicate,
      canonical,
      action: duplicate.active ? 'deactivate' : 'already-inactive',
    });
  }

  const renamePlans: Array<{
    course: LoadedCourse;
    definition: (typeof REVIEWED_CH_RENAMES)[number];
    action: 'rename' | 'already-renamed';
  }> = [];

  for (const definition of REVIEWED_CH_RENAMES) {
    const [currentMatches, renamedMatches] = await Promise.all([
      findByName(definition.currentName),
      findByName(definition.newName),
    ]);

    if (currentMatches.length + renamedMatches.length !== 1) {
      throw new Error(
        `Expected exactly one current or renamed row for "${definition.currentName}" -> "${definition.newName}", found ${currentMatches.length}/${renamedMatches.length}`,
      );
    }

    const course = currentMatches[0] ?? renamedMatches[0];
    if (!course.active) {
      throw new Error(
        `Reviewed rename course is inactive: "${course.name}" id=${course.id}`,
      );
    }

    const distance = courseDistanceKm(
      { lat: course.lat, lon: course.lon },
      { lat: definition.expectedLat, lon: definition.expectedLon },
    );
    if (distance > 0.05) {
      throw new Error(
        `Reviewed rename coordinates moved by ${distance.toFixed(3)}km: "${course.name}"`,
      );
    }

    renamePlans.push({
      course,
      definition,
      action: currentMatches.length === 1 ? 'rename' : 'already-renamed',
    });
  }

  const additionPlans: Array<{
    existing: LoadedCourse | null;
    definition: (typeof REVIEWED_MISSING_CH_COURSES)[number];
    action: 'create' | 'reactivate' | 'already-present';
  }> = [];
  const activeSwissCourses = await prisma.course.findMany({
    where: { country: 'CH', active: true },
    select: { id: true, name: true, lat: true, lon: true },
  });

  for (const definition of REVIEWED_MISSING_CH_COURSES) {
    const matches = await findByName(definition.name);
    if (matches.length > 1) {
      throw new Error(
        `Expected at most one row for "${definition.name}", found ${matches.length}`,
      );
    }

    const existing = matches[0] ?? null;
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
        `Existing course does not match reviewed definition: "${definition.name}"`,
      );
    }

    const collision = activeSwissCourses.find(
      (course) =>
        course.id !== existing?.id &&
        coordinatesMatch(
          course.lat,
          course.lon,
          definition.lat,
          definition.lon,
        ),
    );
    if (collision) {
      throw new Error(
        `Reviewed coordinates for "${definition.name}" already belong to id=${collision.id} name="${collision.name}"`,
      );
    }

    additionPlans.push({
      existing,
      definition,
      action: !existing
        ? 'create'
        : existing.active
          ? 'already-present'
          : 'reactivate',
    });
  }

  for (const plan of duplicatePlans) {
    console.log(
      `Preflight duplicate="${plan.duplicate.name}" id=${plan.duplicate.id} active=${plan.duplicate.active} dependencies=${dependencyTotal(plan.duplicate)} canonical="${plan.canonical.name}" id=${plan.canonical.id}`,
    );
  }
  for (const plan of renamePlans) {
    console.log(
      `Preflight rename="${plan.course.name}" id=${plan.course.id} action=${plan.action} target="${plan.definition.newName}"`,
    );
  }

  const createCount = additionPlans.filter(
    (plan) => plan.action === 'create',
  ).length;
  const reactivateCount = additionPlans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const deactivateCount = duplicatePlans.filter(
    (plan) => plan.action === 'deactivate',
  ).length;
  const expectedActiveAfter =
    activeBefore - deactivateCount + createCount + reactivateCount;

  console.log(
    `Preflight additions=${additionPlans.length} create=${createCount} reactivate=${reactivateCount} already_present=${additionPlans.length - createCount - reactivateCount}`,
  );
  console.log(
    `Preflight active_CH_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );

  for (const plan of duplicatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.duplicate.id} name="${plan.duplicate.name}"`,
    );
  }
  for (const plan of renamePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from="${plan.course.name}" to="${plan.definition.newName}"`,
    );
  }
  for (const plan of additionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run deactivate=${deactivateCount} rename=${renamePlans.filter((plan) => plan.action === 'rename').length} create=${createCount} reactivate=${reactivateCount} active_CH_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const blockedDuplicates = duplicatePlans.filter(
    (plan) =>
      plan.action === 'deactivate' && dependencyTotal(plan.duplicate) > 0,
  );
  if (blockedDuplicates.length > 0) {
    throw new Error(
      `Apply blocked: reviewed duplicate dependencies must be migrated first: ${blockedDuplicates.map((plan) => `${plan.duplicate.name}=${dependencyTotal(plan.duplicate)}`).join(', ')}`,
    );
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-ch-course-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        expectedActiveAfter,
        duplicates: duplicatePlans.map((plan) => ({
          action: plan.action,
          duplicate: plan.duplicate,
          canonical: plan.canonical,
          dependencyTotal: dependencyTotal(plan.duplicate),
        })),
        renames: renamePlans,
        additions: additionPlans,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let created = 0;
  let reactivated = 0;
  let deactivated = 0;
  let renamed = 0;

  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of duplicatePlans) {
      if (plan.action !== 'deactivate') continue;
      await tx.course.update({
        where: { id: plan.duplicate.id },
        data: {
          active: false,
          source: 'manual_review_deactivated_duplicate',
        },
      });
      deactivated++;
    }

    for (const plan of renamePlans) {
      if (plan.action !== 'rename') continue;
      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          name: plan.definition.newName,
          city: plan.definition.city,
          region: plan.definition.region,
          postalCode: plan.definition.postalCode,
          holes: plan.definition.holes,
          website: plan.definition.website,
          source: 'manual_review',
          verified: true,
        },
      });
      renamed++;
    }

    for (const plan of additionPlans) {
      if (plan.action === 'already-present') continue;

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
            source: 'manual_review_google_places',
            verified: true,
            active: true,
          },
        });
        await tx.$executeRaw(Prisma.sql`
          UPDATE "Course"
          SET "location" = ST_SetSRID(
            ST_MakePoint(${plan.definition.lon}, ${plan.definition.lat}),
            4326
          )::geography
          WHERE "id" = ${plan.existing.id}
        `);
        reactivated++;
        continue;
      }

      const inserted = await tx.course.create({
        data: {
          name: plan.definition.name,
          country: 'CH',
          region: plan.definition.region,
          city: plan.definition.city,
          postalCode: plan.definition.postalCode,
          lat: plan.definition.lat,
          lon: plan.definition.lon,
          holes: plan.definition.holes,
          website: plan.definition.website,
          source: 'manual_review_google_places',
          verified: true,
          active: true,
        },
        select: { id: true },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Course"
        SET "location" = ST_SetSRID(
          ST_MakePoint(${plan.definition.lon}, ${plan.definition.lat}),
          4326
        )::geography
        WHERE "id" = ${inserted.id}
      `);
      created++;
    }

    const transactionActiveAfter = await tx.course.count({
      where: { country: 'CH', active: true },
    });
    if (transactionActiveAfter !== expectedActiveAfter) {
      throw new Error(
        `Postflight active CH count mismatch: expected ${expectedActiveAfter}, found ${transactionActiveAfter}`,
      );
    }
    return transactionActiveAfter;
  });

  console.log(
    `Summary: mode=apply deactivated=${deactivated} renamed=${renamed} created=${created} reactivated=${reactivated} active_CH=${activeAfter}`,
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
