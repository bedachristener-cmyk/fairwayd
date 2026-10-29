import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_TH_BARCELONA_VALLEY_COURSES,
  validateReviewedThBarcelonaValleyCourses,
} from '../src/courses/reviewed-th-barcelona-valley-courses';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-th-barcelona-valley-courses',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-th-barcelona-valley-courses');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-th-barcelona-valley-courses is only valid with --apply');
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
  const definitionErrors = validateReviewedThBarcelonaValleyCourses();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed Barcelona Valley definitions: ${definitionErrors.join('; ')}`,
    );
  }

  const ids = REVIEWED_TH_BARCELONA_VALLEY_COURSES.map((course) => course.id);
  const [courses, activeBefore] = await Promise.all([
    prisma.course.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        country: true,
        lat: true,
        lon: true,
        active: true,
      },
    }),
    prisma.course.count({ where: { country: 'TH', active: true } }),
  ]);
  const byId = new Map(courses.map((course) => [course.id, course]));
  const errors: string[] = [];

  const plans = REVIEWED_TH_BARCELONA_VALLEY_COURSES.flatMap((definition) => {
    const course = byId.get(definition.id);
    if (!course) {
      errors.push(`Missing reviewed course id=${definition.id}`);
      return [];
    }
    if (course.country !== 'TH') {
      errors.push(`Wrong country id=${course.id} country=${course.country}`);
      return [];
    }
    if (!(definition.expectedNames as readonly string[]).includes(course.name)) {
      errors.push(`Unexpected name id=${course.id}: "${course.name}"`);
      return [];
    }
    if (
      Math.abs(course.lat - definition.lat) > 0.02 ||
      Math.abs(course.lon - definition.lon) > 0.02
    ) {
      errors.push(
        `Coordinate drift id=${course.id} name="${course.name}" current=${course.lat},${course.lon}`,
      );
      return [];
    }

    const finalState =
      course.name === definition.name &&
      coordinatesMatch(course.lat, course.lon, definition.lat, definition.lon);
    const action = !course.active
      ? 'reactivate'
      : finalState
        ? 'already-applied'
        : 'update';

    return [{ course, definition, action } as const];
  });

  if (errors.length > 0) {
    throw new Error(
      `Barcelona Valley preflight failed with ${errors.length} issue(s):\n${errors.join('\n')}`,
    );
  }

  const updateCount = plans.filter((plan) => plan.action === 'update').length;
  const reactivateCount = plans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const expectedActiveAfter = activeBefore + reactivateCount;

  console.log(
    `Preflight courses=${plans.length} update=${updateCount} reactivate=${reactivateCount} already_applied=${plans.length - updateCount - reactivateCount}`,
  );
  console.log(
    `Preflight active_TH_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: independently named and searchable courses at one resort retain separate course records, feeds and markers.',
  );

  for (const plan of plans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.name}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.lat},${plan.definition.lon}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} reactivate=${reactivateCount} active_TH_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-th-barcelona-valley-courses-${timestamp}.json`,
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

  let updated = 0;
  let reactivated = 0;

  const activeAfter = await prisma.$transaction(
    async (tx) => {
      for (const plan of plans) {
        if (plan.action === 'already-applied') continue;

        await tx.course.update({
          where: { id: plan.course.id },
          data: {
            name: plan.definition.name,
            lat: plan.definition.lat,
            lon: plan.definition.lon,
            active: true,
            verified: true,
            source: 'manual_review_distinct_course_layout',
          },
        });
        await updateLocation(
          tx,
          plan.course.id,
          plan.definition.lat,
          plan.definition.lon,
        );

        if (plan.action === 'reactivate') reactivated++;
        else updated++;
      }

      const count = await tx.course.count({
        where: { country: 'TH', active: true },
      });
      if (count !== expectedActiveAfter) {
        throw new Error(
          `Postflight active TH count mismatch: expected ${expectedActiveAfter}, found ${count}`,
        );
      }
      return count;
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  console.log(
    `Summary: mode=apply updated=${updated} reactivated=${reactivated} active_TH=${activeAfter}`,
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
