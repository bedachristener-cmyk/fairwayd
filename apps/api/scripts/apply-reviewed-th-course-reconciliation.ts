import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  REVIEWED_TH_COURSE_ADDITIONS,
  REVIEWED_TH_COURSE_DEACTIVATIONS,
  REVIEWED_TH_COURSE_UPDATES,
  validateReviewedThCourseReconciliation,
} from '../src/courses/reviewed-th-course-reconciliation';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-th-course-reconciliation',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-th-course-reconciliation');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-th-course-reconciliation is only valid with --apply');
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
  return Object.values(course._count).reduce((sum, count) => sum + count, 0);
}

async function migrateDependencies(
  tx: Prisma.TransactionClient,
  sourceId: string,
  canonicalId: string,
) {
  const canonicalFollowerUsers = await tx.courseFollow.findMany({
    where: { courseId: canonicalId },
    select: { userId: true },
  });
  if (canonicalFollowerUsers.length > 0) {
    await tx.courseFollow.deleteMany({
      where: {
        courseId: sourceId,
        userId: { in: canonicalFollowerUsers.map((item) => item.userId) },
      },
    });
  }

  await tx.courseFollow.updateMany({
    where: { courseId: sourceId },
    data: { courseId: canonicalId },
  });
  await tx.courseRating.updateMany({
    where: { courseId: sourceId },
    data: { courseId: canonicalId },
  });
  await tx.review.updateMany({
    where: { courseId: sourceId },
    data: { courseId: canonicalId },
  });
  await tx.post.updateMany({
    where: { courseId: sourceId },
    data: { courseId: canonicalId },
  });
  await tx.tripItem.updateMany({
    where: { courseId: sourceId },
    data: { courseId: canonicalId },
  });
}

async function updateLocation(
  tx: Prisma.TransactionClient,
  courseId: string,
  lat: number,
  lon: number,
) {
  await tx.$executeRaw(Prisma.sql`
    UPDATE "Course"
    SET "location" = ST_SetSRID(
      ST_MakePoint(${lon}, ${lat}),
      4326
    )::geography
    WHERE "id" = ${courseId}
  `);
}

async function main() {
  const definitionErrors = validateReviewedThCourseReconciliation();

  for (let index = 0; index < REVIEWED_TH_COURSE_ADDITIONS.length; index++) {
    const item = REVIEWED_TH_COURSE_ADDITIONS[index];
    for (
      let otherIndex = index + 1;
      otherIndex < REVIEWED_TH_COURSE_ADDITIONS.length;
      otherIndex++
    ) {
      const other = REVIEWED_TH_COURSE_ADDITIONS[otherIndex];
      if (courseDistanceKm(item, other) <= 0.05) {
        definitionErrors.push(
          `reviewed additions within 50m: "${item.name}" and "${other.name}"`,
        );
      }
    }
  }

  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed TH reconciliation: ${definitionErrors.join('; ')}`,
    );
  }

  const courses = await prisma.course.findMany({
    where: { country: 'TH' },
    select: courseSelect,
  });
  const byId = new Map(courses.map((course) => [course.id, course]));
  const activeBefore = courses.filter((course) => course.active).length;
  const preflightErrors: string[] = [];

  const updatePlans = REVIEWED_TH_COURSE_UPDATES.flatMap((definition) => {
    const course = byId.get(definition.id);
    if (!course) {
      preflightErrors.push(`Missing reviewed update id=${definition.id}`);
      return [];
    }
    if (
      course.name !== definition.expectedName &&
      course.name !== definition.newName
    ) {
      preflightErrors.push(
        `Reviewed update name drift id=${course.id}: "${course.name}"`,
      );
      return [];
    }
    const atOldCoordinates = coordinatesMatch(
      course.lat,
      course.lon,
      definition.oldLat,
      definition.oldLon,
    );
    const atNewCoordinates = coordinatesMatch(
      course.lat,
      course.lon,
      definition.lat,
      definition.lon,
    );
    if (!atOldCoordinates && !atNewCoordinates) {
      preflightErrors.push(
        `Reviewed update coordinate drift id=${course.id} name="${course.name}"`,
      );
      return [];
    }
    if (!course.active) {
      preflightErrors.push(
        `Reviewed update is inactive id=${course.id} name="${course.name}"`,
      );
      return [];
    }
    const action =
      course.name === definition.newName && atNewCoordinates
        ? 'already-applied'
        : 'update';
    return [{ course, definition, action } as const];
  });

  const deactivationPlans = REVIEWED_TH_COURSE_DEACTIVATIONS.flatMap(
    (definition) => {
      const course = byId.get(definition.id);
      if (!course) {
        preflightErrors.push(`Missing reviewed deactivation id=${definition.id}`);
        return [];
      }
      if (course.name !== definition.expectedName) {
        preflightErrors.push(
          `Reviewed deactivation name drift id=${course.id}: "${course.name}"`,
        );
        return [];
      }
      if (definition.canonicalId) {
        const canonical = byId.get(definition.canonicalId);
        if (!canonical || !canonical.active) {
          preflightErrors.push(
            `Missing active canonical id=${definition.canonicalId} for "${course.name}"`,
          );
          return [];
        }
      }
      return [
        {
          course,
          definition,
          action: course.active ? 'deactivate' : 'already-inactive',
        } as const,
      ];
    },
  );

  const idsPlannedForDeactivation = new Set(
    deactivationPlans
      .filter((plan) => plan.action === 'deactivate')
      .map((plan) => plan.course.id),
  );

  for (const plan of deactivationPlans) {
    if (
      plan.action === 'deactivate' &&
      dependencyTotal(plan.course) > 0 &&
      !plan.definition.canonicalId
    ) {
      preflightErrors.push(
        `Cannot deactivate used non-course without canonical target: "${plan.course.name}" dependencies=${dependencyTotal(plan.course)}`,
      );
      continue;
    }
    if (plan.action !== 'deactivate' || !plan.definition.canonicalId) continue;

    const [sourceRatings, sourceReviews] = await Promise.all([
      prisma.courseRating.findMany({
        where: { courseId: plan.course.id },
        select: { userId: true },
      }),
      prisma.review.findMany({
        where: { courseId: plan.course.id },
        select: { userId: true },
      }),
    ]);

    const [ratingConflicts, reviewConflicts] = await Promise.all([
      sourceRatings.length === 0
        ? Promise.resolve(0)
        : prisma.courseRating.count({
            where: {
              courseId: plan.definition.canonicalId,
              userId: { in: sourceRatings.map((item) => item.userId) },
            },
          }),
      sourceReviews.length === 0
        ? Promise.resolve(0)
        : prisma.review.count({
            where: {
              courseId: plan.definition.canonicalId,
              userId: { in: sourceReviews.map((item) => item.userId) },
            },
          }),
    ]);

    if (ratingConflicts > 0 || reviewConflicts > 0) {
      preflightErrors.push(
        `Dependency migration conflict for "${plan.course.name}": ratings=${ratingConflicts} reviews=${reviewConflicts}`,
      );
    }
  }

  const additionPlans: Array<{
    existing: LoadedCourse | null;
    definition: (typeof REVIEWED_TH_COURSE_ADDITIONS)[number];
    action: 'create' | 'reactivate' | 'already-present';
  }> = [];

  for (const definition of REVIEWED_TH_COURSE_ADDITIONS) {
    const sameName = courses.filter(
      (course) =>
        course.name.toLocaleLowerCase() === definition.name.toLocaleLowerCase(),
    );
    if (sameName.length > 1) {
      preflightErrors.push(
        `Expected at most one TH row for "${definition.name}", found ${sameName.length}`,
      );
      continue;
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
      preflightErrors.push(
        `Existing course does not match reviewed addition: "${definition.name}" id=${existing.id}`,
      );
      continue;
    }

    const nearbyCollision = courses.find(
      (course) =>
        course.active &&
        course.id !== existing?.id &&
        !idsPlannedForDeactivation.has(course.id) &&
        courseDistanceKm(course, definition) <= 0.05,
    );
    if (nearbyCollision) {
      preflightErrors.push(
        `Reviewed addition "${definition.name}" is within 50m of active id=${nearbyCollision.id} name="${nearbyCollision.name}"`,
      );
      continue;
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

  if (preflightErrors.length > 0) {
    throw new Error(
      `Reviewed TH preflight failed with ${preflightErrors.length} issue(s):\n${preflightErrors.join('\n')}`,
    );
  }

  const updateCount = updatePlans.filter(
    (plan) => plan.action === 'update',
  ).length;
  const deactivateCount = deactivationPlans.filter(
    (plan) => plan.action === 'deactivate',
  ).length;
  const createCount = additionPlans.filter(
    (plan) => plan.action === 'create',
  ).length;
  const reactivateCount = additionPlans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const expectedActiveAfter =
    activeBefore - deactivateCount + createCount + reactivateCount;

  console.log(
    `Preflight updates=${updatePlans.length} update=${updateCount} already_applied=${updatePlans.length - updateCount}`,
  );
  console.log(
    `Preflight deactivations=${deactivationPlans.length} deactivate=${deactivateCount} already_inactive=${deactivationPlans.length - deactivateCount}`,
  );
  console.log(
    `Preflight additions=${additionPlans.length} create=${createCount} reactivate=${reactivateCount} already_present=${additionPlans.length - createCount - reactivateCount}`,
  );
  console.log(
    `Preflight active_TH_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: one marker per physical golf facility; layouts, academies, clubhouses, driving ranges, simulators, shops and booking businesses do not receive separate course markers.',
  );

  for (const plan of updatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.newName}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.lat},${plan.definition.lon}`,
    );
  }
  for (const plan of deactivationPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} name="${plan.course.name}" dependencies=${dependencyTotal(plan.course)} reason="${plan.definition.reason}"`,
    );
  }
  for (const plan of additionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} deactivate=${deactivateCount} create=${createCount} reactivate=${reactivateCount} active_TH_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const blocked = deactivationPlans.filter(
    (plan) =>
      plan.action === 'deactivate' &&
      dependencyTotal(plan.course) > 0 &&
      !plan.definition.canonicalId,
  );
  if (blocked.length > 0) {
    throw new Error(
      `Apply blocked: used non-course records have no canonical target: ${blocked
        .map((plan) => `${plan.course.name}=${dependencyTotal(plan.course)}`)
        .join(', ')}`,
    );
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-th-course-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        expectedActiveAfter,
        updates: updatePlans,
        deactivations: deactivationPlans.map((plan) => ({
          ...plan,
          dependencyTotal: dependencyTotal(plan.course),
        })),
        additions: additionPlans,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let updated = 0;
  let deactivated = 0;
  let created = 0;
  let reactivated = 0;

  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of updatePlans) {
      if (plan.action !== 'update') continue;
      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          name: plan.definition.newName,
          lat: plan.definition.lat,
          lon: plan.definition.lon,
          source: 'manual_review_google_places',
          verified: true,
        },
      });
      await updateLocation(
        tx,
        plan.course.id,
        plan.definition.lat,
        plan.definition.lon,
      );
      updated++;
    }

    for (const plan of deactivationPlans) {
      if (plan.action !== 'deactivate') continue;
      if (
        plan.definition.canonicalId &&
        dependencyTotal(plan.course) > 0
      ) {
        await migrateDependencies(
          tx,
          plan.course.id,
          plan.definition.canonicalId,
        );
      }
      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          active: false,
          source: plan.definition.canonicalId
            ? 'manual_review_deactivated_duplicate'
            : 'manual_review_deactivated_non_course',
        },
      });
      deactivated++;
    }

    for (const plan of additionPlans) {
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
            source: 'manual_review_google_places',
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
            country: 'TH',
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
          select: { id: true },
        });
        courseId = inserted.id;
        created++;
      }
      await updateLocation(
        tx,
        courseId,
        plan.definition.lat,
        plan.definition.lon,
      );
    }

    const transactionActiveAfter = await tx.course.count({
      where: { country: 'TH', active: true },
    });
    if (transactionActiveAfter !== expectedActiveAfter) {
      throw new Error(
        `Postflight active TH count mismatch: expected ${expectedActiveAfter}, found ${transactionActiveAfter}`,
      );
    }
    return transactionActiveAfter;
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });

  console.log(
    `Summary: mode=apply updated=${updated} deactivated=${deactivated} created=${created} reactivated=${reactivated} active_TH=${activeAfter}`,
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
