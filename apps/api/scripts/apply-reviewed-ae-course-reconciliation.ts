import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_AE_COURSE_ADDITIONS,
  REVIEWED_AE_COURSE_EXCLUSIONS,
  REVIEWED_AE_COURSE_UPDATES,
  validateReviewedAeCourseReconciliation,
} from '../src/courses/reviewed-ae-course-reconciliation';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-ae-course-reconciliation',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-ae-course-reconciliation');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-ae-course-reconciliation is only valid with --apply');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

type ExistingCourse = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  region: string | null;
  holes: number | null;
  lat: number;
  lon: number;
  active: boolean;
};

type AdditionPlan = {
  definition: (typeof REVIEWED_AE_COURSE_ADDITIONS)[number];
  existing: ExistingCourse | null;
  action: 'create' | 'reactivate' | 'update-existing' | 'already-present';
};

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
  const definitionErrors = validateReviewedAeCourseReconciliation();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed UAE definitions: ${definitionErrors.join('; ')}`,
    );
  }

  const allAeCourses = await prisma.course.findMany({
    where: { country: 'AE' },
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
  });
  const activeBefore = allAeCourses.filter((course) => course.active).length;
  const errors: string[] = [];

  const updatePlans = REVIEWED_AE_COURSE_UPDATES.flatMap((definition) => {
    const matches = allAeCourses.filter((course) =>
      definition.expectedNames.includes(course.name),
    );
    if (matches.length !== 1) {
      errors.push(
        `Protected course lookup failed final_name="${definition.name}" expected_one=${matches.length} matches=[${matches.map((course) => `${course.id}:${course.name}`).join(', ')}]`,
      );
      return [];
    }

    const course = matches[0];
    if (distanceKm(course.lat, course.lon, definition.lat, definition.lon) > 20) {
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

  const protectedIds = new Set(updatePlans.map((plan) => plan.course.id));
  const additionPlans = REVIEWED_AE_COURSE_ADDITIONS.flatMap<AdditionPlan>(
    (definition) => {
      const matches = allAeCourses.filter(
        (course) => course.name === definition.name,
      );
      if (matches.length > 1) {
        errors.push(
          `Multiple existing additions name="${definition.name}" ids=[${matches.map((course) => course.id).join(', ')}]`,
        );
        return [];
      }
      const existing = matches[0] ?? null;

      if (!existing && !definition.sharedFacilityGroup) {
        const collision = allAeCourses.find(
          (course) =>
            course.active &&
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
    },
  );

  const exclusionPlans = REVIEWED_AE_COURSE_EXCLUSIONS.flatMap((definition) => {
    const matches = allAeCourses.filter(
      (course) => course.name === definition.name,
    );
    if (matches.length > 1) {
      errors.push(
        `Multiple excluded courses name="${definition.name}" ids=[${matches.map((course) => course.id).join(', ')}]`,
      );
      return [];
    }
    const course = matches[0] ?? null;
    return [
      {
        definition,
        course,
        action: course?.active ? 'deactivate' : course ? 'already-inactive' : 'not-present',
      } as const,
    ];
  });

  if (updatePlans.length !== REVIEWED_AE_COURSE_UPDATES.length) {
    errors.push(
      `Protected course count mismatch: expected ${REVIEWED_AE_COURSE_UPDATES.length}, found ${updatePlans.length}`,
    );
  }
  if (additionPlans.length !== REVIEWED_AE_COURSE_ADDITIONS.length) {
    errors.push(
      `Addition plan count mismatch: expected ${REVIEWED_AE_COURSE_ADDITIONS.length}, found ${additionPlans.length}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(
      `Reviewed UAE preflight failed with ${errors.length} issue(s):\n${errors.join('\n')}`,
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
  const deactivateCount = exclusionPlans.filter(
    (plan) => plan.action === 'deactivate',
  ).length;
  const expectedActiveAfter =
    activeBefore +
    protectedReactivateCount +
    createCount +
    additionReactivateCount -
    deactivateCount;

  console.log(
    `Preflight protected=${updatePlans.length} update=${updateCount} reactivate=${protectedReactivateCount} already_applied=${updatePlans.length - updateCount - protectedReactivateCount}`,
  );
  console.log(
    `Preflight additions=${additionPlans.length} create=${createCount} reactivate=${additionReactivateCount} update_existing=${updateExistingCount} already_present=${additionPlans.length - createCount - additionReactivateCount - updateExistingCount}`,
  );
  console.log(
    `Preflight exclusions=${exclusionPlans.length} deactivate=${deactivateCount}`,
  );
  console.log(
    `Preflight active_AE_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: independently named championship courses retain separate records and feeds; resort, academy and club aliases do not.',
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
  for (const plan of exclusionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" existing_id=${plan.course?.id ?? '-'} reason="${plan.definition.reason}"`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} protected_reactivate=${protectedReactivateCount} create=${createCount} addition_reactivate=${additionReactivateCount} update_existing=${updateExistingCount} deactivate=${deactivateCount} active_AE_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-ae-course-reconciliation-${timestamp}.json`,
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
        exclusionPlans,
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
  let deactivated = 0;

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
              osmId: `google:${plan.definition.placeId}`,
            },
          });
          courseId = plan.existing.id;
          if (plan.action === 'reactivate') reactivated++;
          else updatedExisting++;
        } else {
          const inserted = await tx.course.create({
            data: {
              name: plan.definition.name,
              country: 'AE',
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

      for (const plan of exclusionPlans) {
        if (plan.action !== 'deactivate' || !plan.course) continue;
        await tx.course.update({
          where: { id: plan.course.id },
          data: {
            active: false,
            verified: true,
            source: 'manual_review_google_places_closed',
          },
        });
        deactivated++;
      }

      const count = await tx.course.count({
        where: { country: 'AE', active: true },
      });
      if (count !== expectedActiveAfter) {
        throw new Error(
          `Postflight active AE count mismatch: expected ${expectedActiveAfter}, found ${count}`,
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
    `Summary: mode=apply updated=${updated} reactivated=${reactivated} created=${created} updated_existing=${updatedExisting} deactivated=${deactivated} active_AE=${activeAfter}`,
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
