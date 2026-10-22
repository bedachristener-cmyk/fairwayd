import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  REVIEWED_SG_COURSE_ADDITIONS,
  REVIEWED_SG_COURSE_DEACTIVATIONS,
  REVIEWED_SG_COURSE_UPDATES,
  ReviewedSgCourseDefinition,
  validateReviewedSgCourseReconciliation,
} from '../src/courses/reviewed-sg-course-reconciliation';

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes('--confirm-reviewed-sg-course-reconciliation');
if (apply && !confirmed) {
  console.error('--apply requires --confirm-reviewed-sg-course-reconciliation');
  process.exit(1);
}
if (!apply && confirmed) {
  console.error('--confirm-reviewed-sg-course-reconciliation is only valid with --apply');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
  log: ['error'],
});

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
  definition: ReviewedSgCourseDefinition;
  course: ExistingCourse;
  action: 'update' | 'reactivate' | 'already-applied';
};

type AdditionPlan = {
  definition: ReviewedSgCourseDefinition;
  existing: ExistingCourse | null;
  action: 'create' | 'reactivate' | 'update-existing' | 'already-present';
};

type DeactivationPlan = {
  definition: (typeof REVIEWED_SG_COURSE_DEACTIVATIONS)[number];
  course: ExistingCourse | null;
  action: 'deactivate' | 'already-inactive' | 'already-absent';
};

const REVIEW_SOURCE = 'manual_review_google_places_official_inventory';

function optional(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function reviewedExternalId(definition: ReviewedSgCourseDefinition): string {
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
  return Math.abs(actualLat - expectedLat) <= 1e-8 && Math.abs(actualLon - expectedLon) <= 1e-8;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function isFinalState(course: ExistingCourse, definition: ReviewedSgCourseDefinition): boolean {
  return (
    course.name === definition.name &&
    course.city === optional(definition.city) &&
    course.region === optional(definition.region) &&
    (definition.holes === undefined || course.holes === definition.holes) &&
    (definition.website === undefined || course.website === optional(definition.website)) &&
    (definition.phone === undefined || course.phone === optional(definition.phone)) &&
    course.osmId === reviewedExternalId(definition) &&
    coordinatesMatch(course.lat, course.lon, definition.lat, definition.lon) &&
    course.active &&
    course.verified &&
    course.source === REVIEW_SOURCE
  );
}

function updateData(definition: ReviewedSgCourseDefinition) {
  return {
    name: definition.name,
    city: optional(definition.city),
    region: optional(definition.region),
    ...(definition.holes !== undefined ? { holes: definition.holes } : {}),
    ...(definition.website !== undefined ? { website: optional(definition.website) } : {}),
    ...(definition.phone !== undefined ? { phone: optional(definition.phone) } : {}),
    osmId: reviewedExternalId(definition),
    lat: definition.lat,
    lon: definition.lon,
    active: true,
    verified: true,
    source: REVIEW_SOURCE,
  };
}

async function updateLocation(
  tx: Prisma.TransactionClient,
  courseId: string,
  lat: number,
  lon: number,
) {
  await tx.$executeRaw(Prisma.sql`
    UPDATE "Course"
    SET "location" = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
    WHERE "id" = ${courseId}
  `);
}

async function main() {
  const definitionErrors = validateReviewedSgCourseReconciliation();
  if (definitionErrors.length) {
    throw new Error(`Invalid reviewed Singapore definitions: ${definitionErrors.join('; ')}`);
  }

  const allCourses: ExistingCourse[] = await prisma.course.findMany({
    where: { country: 'SG' },
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
  const activeBefore = allCourses.filter((course) => course.active).length;
  const errors: string[] = [];

  const updatePlans: UpdatePlan[] = REVIEWED_SG_COURSE_UPDATES.flatMap(
    (definition): UpdatePlan[] => {
      const matches = allCourses.filter((course) => course.id === definition.courseId);
      if (matches.length !== 1) {
        errors.push(
          `Protected course lookup failed id=${definition.courseId} final_name="${definition.name}" expected_one=${matches.length}`,
        );
        return [];
      }
      const course = matches[0];
      const drift = distanceKm(course.lat, course.lon, definition.lat, definition.lon);
      if (course.country !== 'SG') {
        errors.push(`Protected course has wrong country id=${course.id} country=${course.country}`);
        return [];
      }
      if (drift > 50) {
        errors.push(
          `Coordinate drift exceeds 50km guard id=${course.id} name="${course.name}" distance_km=${drift.toFixed(2)}`,
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
  const additionPlans: AdditionPlan[] = REVIEWED_SG_COURSE_ADDITIONS.flatMap(
    (definition): AdditionPlan[] => {
      const expectedOsmId = reviewedExternalId(definition);
      const matches = allCourses.filter(
        (course) => course.osmId === expectedOsmId || course.name === definition.name,
      );
      const uniqueMatches = [...new Map(matches.map((course) => [course.id, course])).values()];
      if (uniqueMatches.length > 1) {
        errors.push(
          `Multiple existing additions name="${definition.name}" ids=[${uniqueMatches.map((course) => course.id).join(', ')}]`,
        );
        return [];
      }

      const existing = uniqueMatches[0] ?? null;
      if (!existing) {
        const collision = definition.allowSharedLocation
          ? undefined
          : allCourses.find(
              (course) =>
                course.active &&
                !protectedIds.has(course.id) &&
                distanceKm(course.lat, course.lon, definition.lat, definition.lon) < 0.02,
            );
        if (collision) {
          errors.push(
            `Reviewed addition "${definition.name}" is within 20m of active id=${collision.id} name="${collision.name}"; review as one facility`,
          );
          return [];
        }
        return [{ definition, existing: null, action: 'create' }];
      }

      if (existing.country !== 'SG') {
        errors.push(`Existing addition has wrong country id=${existing.id} country=${existing.country}`);
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

  const deactivationPlans: DeactivationPlan[] = REVIEWED_SG_COURSE_DEACTIVATIONS.flatMap(
    (definition): DeactivationPlan[] => {
      const expectedOsmId = `google:${definition.placeId}`;
      const matches = allCourses.filter(
        (course) => course.osmId === expectedOsmId || course.name === definition.name,
      );
      const uniqueMatches = [...new Map(matches.map((course) => [course.id, course])).values()];
      if (uniqueMatches.length > 1) {
        errors.push(
          `Multiple deactivation matches name="${definition.name}" ids=[${uniqueMatches.map((course) => course.id).join(', ')}]`,
        );
        return [];
      }
      const course = uniqueMatches[0] ?? null;
      if (!course) {
        return [{ definition, course: null, action: 'already-absent' }];
      }
      if (course.country !== 'SG') {
        errors.push(`Deactivation has wrong country id=${course.id} country=${course.country}`);
        return [];
      }
      return [{
        definition,
        course,
        action: course.active ? 'deactivate' : 'already-inactive',
      }];
    },
  );

  if (updatePlans.length !== REVIEWED_SG_COURSE_UPDATES.length) {
    errors.push(
      `Protected course count mismatch: expected ${REVIEWED_SG_COURSE_UPDATES.length}, found ${updatePlans.length}`,
    );
  }
  if (additionPlans.length !== REVIEWED_SG_COURSE_ADDITIONS.length) {
    errors.push(
      `Addition plan count mismatch: expected ${REVIEWED_SG_COURSE_ADDITIONS.length}, found ${additionPlans.length}`,
    );
  }
  if (deactivationPlans.length !== REVIEWED_SG_COURSE_DEACTIVATIONS.length) {
    errors.push(
      `Deactivation plan count mismatch: expected ${REVIEWED_SG_COURSE_DEACTIVATIONS.length}, found ${deactivationPlans.length}`,
    );
  }
  if (errors.length) {
    throw new Error(`Reviewed Singapore preflight failed with ${errors.length} issue(s):\n${errors.join('\n')}`);
  }

  const updateCount = updatePlans.filter((plan) => plan.action === 'update').length;
  const protectedReactivateCount = updatePlans.filter((plan) => plan.action === 'reactivate').length;
  const createCount = additionPlans.filter((plan) => plan.action === 'create').length;
  const additionReactivateCount = additionPlans.filter((plan) => plan.action === 'reactivate').length;
  const updateExistingCount = additionPlans.filter((plan) => plan.action === 'update-existing').length;
  const deactivateCount = deactivationPlans.filter((plan) => plan.action === 'deactivate').length;
  const expectedActiveAfter =
    activeBefore + protectedReactivateCount + createCount + additionReactivateCount - deactivateCount;

  console.log(
    `Preflight protected=${updatePlans.length} update=${updateCount} reactivate=${protectedReactivateCount} already_applied=${updatePlans.length - updateCount - protectedReactivateCount}`,
  );
  console.log(
    `Preflight additions=${additionPlans.length} create=${createCount} reactivate=${additionReactivateCount} update_existing=${updateExistingCount} already_present=${additionPlans.length - createCount - additionReactivateCount - updateExistingCount}`,
  );
  console.log(`Preflight active_SG_before=${activeBefore} expected_after=${expectedActiveAfter}`);
  console.log(
    `Preflight invalid=${deactivationPlans.length} deactivate=${deactivateCount} already_inactive_or_absent=${deactivationPlans.length - deactivateCount}`,
  );
  console.log(
    'Policy: independently named and searchable courses retain separate records and feeds; indoor golf, driving ranges, aliases, discovery noise and unsupported closed facilities are excluded.',
  );

  for (const plan of updatePlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course.id} from_name="${plan.course.name}" to_name="${plan.definition.name}" from=${plan.course.lat},${plan.course.lon} to=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes ?? 'preserve'}`,
    );
  }
  for (const plan of additionPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.definition.name}" coordinates=${plan.definition.lat},${plan.definition.lon} holes=${plan.definition.holes ?? '-'} existing_id=${plan.existing?.id ?? '-'}`,
    );
  }
  for (const plan of deactivationPlans) {
    console.log(
      `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} id=${plan.course?.id ?? '-'} name="${plan.definition.name}" reason="${plan.definition.reason}"`,
    );
  }

  if (!apply) {
    console.log(
      `Summary: mode=dry-run update=${updateCount} protected_reactivate=${protectedReactivateCount} create=${createCount} addition_reactivate=${additionReactivateCount} update_existing=${updateExistingCount} deactivate=${deactivateCount} active_SG_expected=${expectedActiveAfter} database_changes=0`,
    );
    return;
  }

  const manifestDir = path.resolve('course-coordinate-manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(manifestDir, `reviewed-sg-course-reconciliation-${timestamp}.json`);
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ createdAt: new Date().toISOString(), activeBefore, expectedActiveAfter, updatePlans, additionPlans, deactivationPlans }, null, 2)}\n`,
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
        await tx.course.update({ where: { id: plan.course.id }, data: updateData(plan.definition) });
        await updateLocation(tx, plan.course.id, plan.definition.lat, plan.definition.lon);
        if (plan.action === 'reactivate') reactivated++;
        else updated++;
      }

      for (const plan of additionPlans) {
        if (plan.action === 'already-present') continue;
        let courseId: string;
        if (plan.existing) {
          await tx.course.update({ where: { id: plan.existing.id }, data: updateData(plan.definition) });
          courseId = plan.existing.id;
          if (plan.action === 'reactivate') reactivated++;
          else updatedExisting++;
        } else {
          const inserted = await tx.course.create({
            data: { country: 'SG', ...updateData(plan.definition) },
            select: { id: true },
          });
          courseId = inserted.id;
          created++;
        }
        await updateLocation(tx, courseId, plan.definition.lat, plan.definition.lon);
      }

      for (const plan of deactivationPlans) {
        if (plan.action !== 'deactivate' || !plan.course) continue;
        await tx.course.update({
          where: { id: plan.course.id },
          data: { active: false },
        });
      }

      const count = await tx.course.count({ where: { country: 'SG', active: true } });
      if (count !== expectedActiveAfter) {
        throw new Error(`Postflight active PH count mismatch: expected ${expectedActiveAfter}, found ${count}`);
      }
      return count;
    },
    { maxWait: 20_000, timeout: 180_000 },
  );

  console.log(
    `Summary: mode=apply updated=${updated} reactivated=${reactivated} created=${created} updated_existing=${updatedExisting} deactivated=${deactivateCount} active_SG=${activeAfter}`,
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
