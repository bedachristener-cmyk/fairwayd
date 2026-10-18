import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_AT_FACILITY_ALIASES,
  REVIEWED_AT_INVALID_RECORDS,
  validateReviewedAtFacilityReconciliation,
} from '../src/courses/reviewed-at-facility-reconciliation';

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
  '--confirm-reviewed-at-facility-reconciliation',
);

if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-at-facility-reconciliation',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-at-facility-reconciliation is only valid with --apply',
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

async function loadExpectedCourse(
  id: string,
  name: string,
  lat: number,
  lon: number,
): Promise<LoadedCourse> {
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
  if (course.name !== name) {
    throw new Error(
      `Name changed for id=${id}: expected "${name}", found "${course.name}"`,
    );
  }
  if (!coordinatesMatch(course.lat, course.lon, lat, lon)) {
    throw new Error(
      `Coordinates changed for id=${id} name="${name}": expected ${lat},${lon}, found ${course.lat},${course.lon}`,
    );
  }

  return course;
}

async function main() {
  const definitionErrors = validateReviewedAtFacilityReconciliation();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed AT facility reconciliation: ${definitionErrors.join('; ')}`,
    );
  }

  const activeBefore = await prisma.course.count({
    where: { country: 'AT', active: true },
  });

  const aliasPlans: Array<{
    duplicate: LoadedCourse;
    canonical: LoadedCourse;
    reason: string;
    action: 'deactivate' | 'already-inactive';
  }> = [];

  for (const item of REVIEWED_AT_FACILITY_ALIASES) {
    const [duplicate, canonical] = await Promise.all([
      loadExpectedCourse(
        item.duplicateId,
        item.duplicateName,
        item.duplicateLat,
        item.duplicateLon,
      ),
      loadExpectedCourse(
        item.canonicalId,
        item.canonicalName,
        item.canonicalLat,
        item.canonicalLon,
      ),
    ]);

    if (!canonical.active) {
      throw new Error(
        `Canonical facility is inactive: id=${canonical.id} name="${canonical.name}"`,
      );
    }

    aliasPlans.push({
      duplicate,
      canonical,
      reason: item.reason,
      action: duplicate.active ? 'deactivate' : 'already-inactive',
    });
  }

  const invalidPlans: Array<{
    course: LoadedCourse;
    reason: string;
    action: 'deactivate' | 'already-inactive';
  }> = [];

  for (const item of REVIEWED_AT_INVALID_RECORDS) {
    const course = await loadExpectedCourse(
      item.id,
      item.name,
      item.lat,
      item.lon,
    );
    invalidPlans.push({
      course,
      reason: item.reason,
      action: course.active ? 'deactivate' : 'already-inactive',
    });
  }

  for (const plan of aliasPlans) {
    console.log(
      `Preflight alias="${plan.duplicate.name}" id=${plan.duplicate.id} active=${plan.duplicate.active} dependencies=${dependencyTotal(plan.duplicate)} canonical="${plan.canonical.name}" id=${plan.canonical.id} reason=${plan.reason}`,
    );
  }
  for (const plan of invalidPlans) {
    console.log(
      `Preflight invalid="${plan.course.name}" id=${plan.course.id} active=${plan.course.active} dependencies=${dependencyTotal(plan.course)} reason=${plan.reason}`,
    );
  }

  const deactivationPlans = [
    ...aliasPlans.map((plan) => ({
      course: plan.duplicate,
      action: plan.action,
      reason: plan.reason,
      canonicalId: plan.canonical.id,
      canonicalName: plan.canonical.name,
    })),
    ...invalidPlans.map((plan) => ({
      course: plan.course,
      action: plan.action,
      reason: plan.reason,
      canonicalId: null,
      canonicalName: null,
    })),
  ];
  const deactivateCount = deactivationPlans.filter(
    (plan) => plan.action === 'deactivate',
  ).length;
  const expectedActiveAfter = activeBefore - deactivateCount;

  console.log(
    `Preflight active_AT_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: one marker per golf facility; course layouts and academies do not receive separate markers.',
  );

  for (const plan of deactivationPlans) {
    const canonical = plan.canonicalName
      ? ` canonical="${plan.canonicalName}" canonical_id=${plan.canonicalId}`
      : '';
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} name="${plan.course.name}" reason=${plan.reason}${canonical}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run aliases=${aliasPlans.length} invalid=${invalidPlans.length} deactivate=${deactivateCount} active_AT_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const blocked = deactivationPlans.filter(
    (plan) =>
      plan.action === 'deactivate' && dependencyTotal(plan.course) > 0,
  );
  if (blocked.length > 0) {
    throw new Error(
      `Apply blocked: dependencies must be reviewed and migrated first: ${blocked
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
    `reviewed-at-facility-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        policy: 'one-marker-per-golf-facility',
        activeBefore,
        expectedActiveAfter,
        aliases: aliasPlans.map((plan) => ({
          action: plan.action,
          reason: plan.reason,
          duplicate: plan.duplicate,
          canonical: plan.canonical,
          dependencyTotal: dependencyTotal(plan.duplicate),
        })),
        invalidRecords: invalidPlans.map((plan) => ({
          action: plan.action,
          reason: plan.reason,
          course: plan.course,
          dependencyTotal: dependencyTotal(plan.course),
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let deactivated = 0;
  const activeAfter = await prisma.$transaction(async (tx) => {
    for (const plan of deactivationPlans) {
      if (plan.action !== 'deactivate') continue;
      await tx.course.update({
        where: { id: plan.course.id },
        data: {
          active: false,
          source:
            plan.reason === 'wrong-country-record'
              ? 'manual_review_deactivated_wrong_country'
              : 'manual_review_deactivated_facility_alias',
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
    `Summary: mode=apply deactivated=${deactivated} active_AT=${activeAfter}`,
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
