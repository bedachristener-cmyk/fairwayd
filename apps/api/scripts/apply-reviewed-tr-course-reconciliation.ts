import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_TR_COURSE_ADDITIONS,
  REVIEWED_TR_COURSE_UPDATES,
  validateReviewedTrCourseReconciliation,
} from '../src/courses/reviewed-tr-course-reconciliation';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-tr-course-reconciliation',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-tr-course-reconciliation');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-tr-course-reconciliation is only valid with --apply');
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

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
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
  const definitionErrors = validateReviewedTrCourseReconciliation();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed Turkey definitions: ${definitionErrors.join('; ')}`,
    );
  }

  const updateIds = REVIEWED_TR_COURSE_UPDATES.map((course) => course.id);
  const additionNames = REVIEWED_TR_COURSE_ADDITIONS.map(
    (course) => course.name,
  );

  const [protectedCourses, existingAdditions, activeCourses, activeBefore] =
    await Promise.all([
      prisma.course.findMany({
        where: { id: { in: updateIds } },
        select: {
          id: true,
          name: true,
          country: true,
          city: true,
          region: true,
          holes: true,
          lat: true,
          lon: true,
          active: true,
        },
      }),
      prisma.course.findMany({
        where: { country: 'TR', name: { in: additionNames } },
        select: {
          id: true,
          name: true,
          country: true,
          city: true,
          region: true,
          holes: true,
          lat: true,
          lon: true,
          active: true,
        },
      }),
      prisma.course.findMany({
        where: { country: 'TR', active: true },
        select: { id: true, name: true, lat: true, lon: true },
      }),
      prisma.course.count({ where: { country: 'TR', active: true } }),
    ]);

  const protectedById = new Map(
    protectedCourses.map((course) => [course.id, course]),
  );
  const additionsByName = new Map(
    existingAdditions.map((course) => [course.name, course]),
  );
  const errors: string[] = [];

  const updatePlans = REVIEWED_TR_COURSE_UPDATES.flatMap((definition) => {
    const course = protectedById.get(definition.id);
    if (!course) {
      errors.push(`Missing protected course id=${definition.id}`);
      return [];
    }
    if (course.country !== 'TR') {
      errors.push(`Wrong country id=${course.id} country=${course.country}`);
      return [];
    }
    if (!definition.expectedNames.includes(course.name)) {
      errors.push(`Unexpected name id=${course.id}: "${course.name}"`);
      return [];
    }
    if (distanceKm(course.lat, course.lon, definition.lat, definition.lon) > 15) {
      errors.push(
        `Coordinate drift exceeds guard id=${course.id} name="${course.name}" current=${course.lat},${course.lon}`,
      );
      return [];
    }

    const finalState =
      course.name === definition.name &&
      course.city === definition.city &&
      course.region === definition.region &&
      course.holes === definition.holes &&
      coordinatesMatch(course.lat, course.lon, definition.lat, definition.lon) &&
      course.active;
    const action = finalState
      ? 'already-applied'
      : course.active
        ? 'update'
        : 'reactivate';

    return [{ definition, course, action } as const];
  });

  const protectedIds = new Set(updateIds);
  const additionPlans = REVIEWED_TR_COURSE_ADDITIONS.flatMap((definition) => {
    const existing = additionsByName.get(definition.name);

    if (!existing && !definition.sharedFacilityGroup) {
      const collision = activeCourses.find(
        (course) =>
          !protectedIds.has(course.id) &&
          distanceKm(course.lat, course.lon, definition.lat, definition.lon) <
            0.05,
      );
      if (collision) {
        errors.push(
          `Reviewed addition "${definition.name}" is within 50m of active id=${collision.id} name="${collision.name}"; review as one facility`,
        );
        return [];
      }
    }

    if (!existing) {
      return [{ definition, existing: null, action: 'create' } as const];
    }

    const finalState =
      existing.city === definition.city &&
      existing.region === definition.region &&
      existing.holes === definition.holes &&
      coordinatesMatch(
        existing.lat,
        existing.lon,
        definition.lat,
        definition.lon,
      ) &&
      existing.active;
    const action = finalState
      ? 'already-present'
      : existing.active
        ? 'update-existing'
        : 'reactivate';

    return [{ definition, existing, action } as const];
  });

  if (protectedCourses.length !== REVIEWED_TR_COURSE_UPDATES.length) {
    errors.push(
      `Protected course count mismatch: expected ${REVIEWED_TR_COURSE_UPDATES.length}, found ${protectedCourses.length}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(
      `Reviewed Turkey preflight failed with ${errors.length} issue(s):\n${errors.join('\n')}`,
    );
  }

  const updateCount = updatePlans.filter(
    (plan) => plan.action === 'update',
  ).length;
  const protectedReactivateCount = updatePlans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const createCount = additionPlans.filter(
    (plan) => plan.action === 'create',
  ).length;
  const additionReactivateCount = additionPlans.filter(
    (plan) => plan.action === 'reactivate',
  ).length;
  const updateExistingCount = additionPlans.filter(
    (plan) => plan.action === 'update-existing',
  ).length;
  const expectedActiveAfter =
    activeBefore +
    protectedReactivateCount +
    createCount +
    additionReactivateCount;

  console.log(
    `Preflight protected=${updatePlans.length} update=${updateCount} reactivate=${protectedReactivateCount} already_applied=${updatePlans.length - updateCount - protectedReactivateCount}`,
  );
  console.log(
    `Preflight additions=${additionPlans.length} create=${createCount} reactivate=${additionReactivateCount} update_existing=${updateExistingCount} already_present=${additionPlans.length - createCount - additionReactivateCount - updateExistingCount}`,
  );
  console.log(
    `Preflight active_TR_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: independently named and searchable courses retain separate records and feeds; club, hotel and course aliases at one physical layout do not.',
  );

  for (const plan of updatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.name}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes}`,
    );
  }
  for (const plan of additionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes} existing_id=${plan.existing?.id ?? '-'}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} protected_reactivate=${protectedReactivateCount} create=${createCount} addition_reactivate=${additionReactivateCount} update_existing=${updateExistingCount} active_TR_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-tr-course-reconciliation-${timestamp}.json`,
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        activeBefore,
        expectedActiveAfter,
        updatePlans,
        additionPlans,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Manifest written: ${manifestPath}`);

  let updated = 0;
  let reactivated = 0;
  let created = 0;
  let updatedExisting = 0;

  const activeAfter = await prisma.$transaction(
    async (tx) => {
      for (const plan of updatePlans) {
        if (plan.action === 'already-applied') continue;

        await tx.course.update({
          where: { id: plan.course.id },
          data: {
            name: plan.definition.name,
            city: plan.definition.city,
            region: plan.definition.region,
            holes: plan.definition.holes,
            lat: plan.definition.lat,
            lon: plan.definition.lon,
            active: true,
            verified: true,
            source: 'manual_review_google_places_official_inventory',
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

      for (const plan of additionPlans) {
        if (plan.action === 'already-present') continue;

        let courseId: string;
        if (plan.existing) {
          await tx.course.update({
            where: { id: plan.existing.id },
            data: {
              city: plan.definition.city,
              region: plan.definition.region,
              holes: plan.definition.holes,
              lat: plan.definition.lat,
              lon: plan.definition.lon,
              active: true,
              verified: true,
              source: 'manual_review_google_places_official_inventory',
            },
          });
          courseId = plan.existing.id;
          if (plan.action === 'reactivate') reactivated++;
          else updatedExisting++;
        } else {
          const inserted = await tx.course.create({
            data: {
              name: plan.definition.name,
              country: 'TR',
              city: plan.definition.city,
              region: plan.definition.region,
              holes: plan.definition.holes,
              lat: plan.definition.lat,
              lon: plan.definition.lon,
              active: true,
              verified: true,
              source: 'manual_review_google_places_official_inventory',
              osmId: `google:${plan.definition.placeId}`,
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

      const count = await tx.course.count({
        where: { country: 'TR', active: true },
      });
      if (count !== expectedActiveAfter) {
        throw new Error(
          `Postflight active TR count mismatch: expected ${expectedActiveAfter}, found ${count}`,
        );
      }
      return count;
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );

  console.log(
    `Summary: mode=apply updated=${updated} reactivated=${reactivated} created=${created} updated_existing=${updatedExisting} active_TR=${activeAfter}`,
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
