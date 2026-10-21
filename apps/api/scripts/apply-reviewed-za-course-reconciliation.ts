import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_ZA_COURSE_ADDITIONS,
  REVIEWED_ZA_COURSE_UPDATES,
  ReviewedZaCourseDefinition,
  validateReviewedZaCourseReconciliation,
} from '../src/courses/reviewed-za-course-reconciliation';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-za-course-reconciliation',
);

if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-za-course-reconciliation');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-za-course-reconciliation is only valid with --apply');
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
  website: string | null;
  phone: string | null;
  osmId: string | null;
  lat: number;
  lon: number;
  active: boolean;
  verified: boolean;
  source: string;
};

type UpdatePlan = {
  definition: ReviewedZaCourseDefinition;
  course: ExistingCourse;
  action: 'update' | 'reactivate' | 'already-applied';
};

type AdditionPlan = {
  definition: ReviewedZaCourseDefinition;
  existing: ExistingCourse | null;
  action: 'create' | 'reactivate' | 'update-existing' | 'already-present';
};

const REVIEW_SOURCE = 'manual_review_google_places_official_inventory';

function optional(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function reviewedExternalId(
  definition: ReviewedZaCourseDefinition,
): string {
  return definition.placeId.startsWith('manual:')
    ? definition.placeId
    : `google:${definition.placeId}`;
}

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

function isFinalState(
  course: ExistingCourse,
  definition: ReviewedZaCourseDefinition,
): boolean {
  return (
    course.name === definition.name &&
    course.city === optional(definition.city) &&
    course.region === optional(definition.region) &&
    course.holes === definition.holes &&
    course.website === optional(definition.website) &&
    course.phone === optional(definition.phone) &&
    course.osmId === reviewedExternalId(definition) &&
    coordinatesMatch(course.lat, course.lon, definition.lat, definition.lon) &&
    course.active &&
    course.verified &&
    course.source === REVIEW_SOURCE
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
  const definitionErrors = validateReviewedZaCourseReconciliation();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid reviewed South Africa definitions: ${definitionErrors.join('; ')}`,
    );
  }

  const allZaCourses: ExistingCourse[] = await prisma.course.findMany({
    where: { country: 'ZA' },
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      region: true,
      holes: true,
      website: true,
      phone: true,
      osmId: true,
      lat: true,
      lon: true,
      active: true,
      verified: true,
      source: true,
    },
  });
  const activeBefore = allZaCourses.filter((course) => course.active).length;
  const errors: string[] = [];

  const updatePlans: UpdatePlan[] = REVIEWED_ZA_COURSE_UPDATES.flatMap(
    (definition): UpdatePlan[] => {
      const matches = allZaCourses.filter(
        (course) => course.id === definition.courseId,
      );
      if (matches.length !== 1) {
        errors.push(
          `Protected course lookup failed id=${definition.courseId} final_name="${definition.name}" expected_one=${matches.length}`,
        );
        return [];
      }

      const course = matches[0];
      if (course.country !== 'ZA') {
        errors.push(
          `Protected course has wrong country id=${course.id} country=${course.country}`,
        );
        return [];
      }
      const driftKm = distanceKm(
        course.lat,
        course.lon,
        definition.lat,
        definition.lon,
      );
      if (driftKm > 30) {
        errors.push(
          `Coordinate drift exceeds 30km guard id=${course.id} name="${course.name}" distance_km=${driftKm.toFixed(2)} current=${course.lat},${course.lon} reviewed=${definition.lat},${definition.lon}`,
        );
        return [];
      }

      const action = isFinalState(course, definition)
        ? 'already-applied'
        : course.active
          ? 'update'
          : 'reactivate';
      return [{ definition, course, action }];
    },
  );

  const protectedIds = new Set(updatePlans.map((plan) => plan.course.id));
  const additionPlans: AdditionPlan[] = REVIEWED_ZA_COURSE_ADDITIONS.flatMap(
    (definition): AdditionPlan[] => {
      const expectedOsmId = reviewedExternalId(definition);
      const matches = allZaCourses.filter(
        (course) =>
          course.osmId === expectedOsmId || course.name === definition.name,
      );
      const uniqueMatches = [
        ...new Map(matches.map((course) => [course.id, course])).values(),
      ];

      if (uniqueMatches.length > 1) {
        errors.push(
          `Multiple existing additions name="${definition.name}" ids=[${uniqueMatches.map((course) => course.id).join(', ')}]`,
        );
        return [];
      }

      const existing = uniqueMatches[0] ?? null;
      if (!existing) {
        const collision = allZaCourses.find(
          (course) =>
            course.active &&
            !protectedIds.has(course.id) &&
            distanceKm(course.lat, course.lon, definition.lat, definition.lon) <
              0.02,
        );
        if (collision) {
          errors.push(
            `Reviewed addition "${definition.name}" is within 20m of active id=${collision.id} name="${collision.name}"; review as one facility`,
          );
          return [];
        }
        return [{ definition, existing: null, action: 'create' }];
      }

      if (existing.country !== 'ZA') {
        errors.push(
          `Existing addition has wrong country id=${existing.id} country=${existing.country}`,
        );
        return [];
      }

      const action = isFinalState(existing, definition)
        ? 'already-present'
        : existing.active
          ? 'update-existing'
          : 'reactivate';
      return [{ definition, existing, action }];
    },
  );

  if (updatePlans.length !== REVIEWED_ZA_COURSE_UPDATES.length) {
    errors.push(
      `Protected course count mismatch: expected ${REVIEWED_ZA_COURSE_UPDATES.length}, found ${updatePlans.length}`,
    );
  }
  if (additionPlans.length !== REVIEWED_ZA_COURSE_ADDITIONS.length) {
    errors.push(
      `Addition plan count mismatch: expected ${REVIEWED_ZA_COURSE_ADDITIONS.length}, found ${additionPlans.length}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(
      `Reviewed South Africa preflight failed with ${errors.length} issue(s):\n${errors.join('\n')}`,
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
    `Preflight active_ZA_before=${activeBefore} expected_after=${expectedActiveAfter}`,
  );
  console.log(
    'Policy: independently named and searchable courses retain separate records and feeds; obvious discovery noise, aliases and temporarily closed candidates are excluded.',
  );

  for (const plan of updatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.name}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes ?? '-'}`,
    );
  }
  for (const plan of additionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes ?? '-'} existing_id=${plan.existing?.id ?? '-'}`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} protected_reactivate=${protectedReactivateCount} create=${createCount} addition_reactivate=${additionReactivateCount} update_existing=${updateExistingCount} active_ZA_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(
    manifestDir,
    `reviewed-za-course-reconciliation-${timestamp}.json`,
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
            city: optional(plan.definition.city),
            region: optional(plan.definition.region),
            holes: plan.definition.holes,
            website: optional(plan.definition.website),
            phone: optional(plan.definition.phone),
            osmId: reviewedExternalId(plan.definition),
            lat: plan.definition.lat,
            lon: plan.definition.lon,
            active: true,
            verified: true,
            source: REVIEW_SOURCE,
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
              name: plan.definition.name,
              city: optional(plan.definition.city),
              region: optional(plan.definition.region),
              holes: plan.definition.holes,
              website: optional(plan.definition.website),
              phone: optional(plan.definition.phone),
              osmId: reviewedExternalId(plan.definition),
              lat: plan.definition.lat,
              lon: plan.definition.lon,
              active: true,
              verified: true,
              source: REVIEW_SOURCE,
            },
          });
          courseId = plan.existing.id;
          if (plan.action === 'reactivate') reactivated++;
          else updatedExisting++;
        } else {
          const inserted = await tx.course.create({
            data: {
              name: plan.definition.name,
              country: 'ZA',
              city: optional(plan.definition.city),
              region: optional(plan.definition.region),
              holes: plan.definition.holes,
              website: optional(plan.definition.website),
              phone: optional(plan.definition.phone),
              osmId: reviewedExternalId(plan.definition),
              lat: plan.definition.lat,
              lon: plan.definition.lon,
              active: true,
              verified: true,
              source: REVIEW_SOURCE,
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
        where: { country: 'ZA', active: true },
      });
      if (count !== expectedActiveAfter) {
        throw new Error(
          `Postflight active ZA count mismatch: expected ${expectedActiveAfter}, found ${count}`,
        );
      }
      return count;
    },
    {
      maxWait: 20_000,
      timeout: 180_000,
    },
  );

  console.log(
    `Summary: mode=apply updated=${updated} reactivated=${reactivated} created=${created} updated_existing=${updatedExisting} active_ZA=${activeAfter}`,
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
