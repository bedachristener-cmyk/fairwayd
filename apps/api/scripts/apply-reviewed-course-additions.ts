import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { courseDistanceKm } from '../src/courses/course-completeness-review';
import {
  type ApprovedCourseAddition,
  parseApprovedCourseAddition,
  type ReviewedCourseAdditionInput,
} from '../src/courses/reviewed-course-addition';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function coordinatesMatch(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): boolean {
  return Math.abs(a.lat - b.lat) <= 1e-8 && Math.abs(a.lon - b.lon) <= 1e-8;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(
      [
        'Usage:',
        '  npx ts-node scripts/apply-reviewed-course-additions.ts <review.csv> --country XX',
        '  npx ts-node scripts/apply-reviewed-course-additions.ts <review.csv> --country XX --apply --confirm-reviewed-course-additions',
        '',
        'Only rows with reviewDecision=APPROVE are eligible.',
        'Without --apply the command is a read-only dry-run.',
      ].join('\n'),
    );
    return;
  }

  const fileArg = process.argv[2];
  const country = String(argumentValue('--country') ?? '')
    .trim()
    .toUpperCase();
  const apply = process.argv.includes('--apply');
  const confirmed = process.argv.includes('--confirm-reviewed-course-additions');

  if (!fileArg) throw new Error('Review CSV path is required');
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error('--country requires a two-letter ISO country code');
  }
  if (apply && !confirmed) {
    throw new Error('--apply requires --confirm-reviewed-course-additions');
  }
  if (!apply && confirmed) {
    throw new Error('--confirm-reviewed-course-additions is only valid with --apply');
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Review CSV not found: ${filePath}`);
  }

  const rows = parse(fs.readFileSync(filePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as ReviewedCourseAdditionInput[];

  const approved: ApprovedCourseAddition[] = [];
  const invalid: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const result = parseApprovedCourseAddition(row, country);
    if (result.kind === 'approved') approved.push(result.addition);
    if (result.kind === 'skipped') skipped++;
    if (result.kind === 'invalid') {
      invalid.push(
        `row=${index + 2} name=${row.name || '<missing>'} reason=${result.reason}`,
      );
    }
  });

  const duplicateNames = approved
    .map((item) => item.name.toLocaleLowerCase())
    .filter((name, index, names) => names.indexOf(name) !== index);
  const duplicatePlaceIds = approved
    .map((item) => item.googlePlaceId)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateNames.length > 0) {
    invalid.push(`duplicate approved names: ${[...new Set(duplicateNames)].join(', ')}`);
  }
  if (duplicatePlaceIds.length > 0) {
    invalid.push(
      `duplicate approved Google Place IDs: ${[...new Set(duplicatePlaceIds)].join(', ')}`,
    );
  }
  if (invalid.length > 0) {
    console.error('Preflight failed: invalid reviewed rows');
    invalid.forEach((message) => console.error(`- ${message}`));
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter, log: ['error'] });

  try {
    const existingCourses = await prisma.course.findMany({
      where: { country },
      select: {
        id: true,
        name: true,
        lat: true,
        lon: true,
        active: true,
      },
    });
    const activeBefore = existingCourses.filter((course) => course.active).length;
    const plans: Array<{
      addition: ApprovedCourseAddition;
      existingId: string | null;
      action: 'create' | 'reactivate' | 'already-present';
    }> = [];
    const preflightErrors: string[] = [];

    for (const addition of approved) {
      const sameName = existingCourses.filter(
        (course) => course.name.toLocaleLowerCase() === addition.name.toLocaleLowerCase(),
      );
      const exact = sameName.find((course) => coordinatesMatch(course, addition));

      if (!exact && sameName.length > 0) {
        preflightErrors.push(
          `name="${addition.name}" already exists at different coordinates; use coordinate review or manual reconciliation`,
        );
        continue;
      }

      const nearbyCollision = existingCourses.find(
        (course) =>
          course.active &&
          course.id !== exact?.id &&
          courseDistanceKm(course, addition) <= 0.05,
      );
      if (nearbyCollision) {
        preflightErrors.push(
          `name="${addition.name}" is within 50m of active id=${nearbyCollision.id} name="${nearbyCollision.name}"; review as duplicate or multi-course facility`,
        );
        continue;
      }

      plans.push({
        addition,
        existingId: exact?.id ?? null,
        action: !exact
          ? 'create'
          : exact.active
            ? 'already-present'
            : 'reactivate',
      });
    }

    if (preflightErrors.length > 0) {
      console.error('Preflight failed: database state requires manual review');
      preflightErrors.forEach((message) => console.error(`- ${message}`));
      process.exitCode = 1;
      return;
    }

    const createCount = plans.filter((plan) => plan.action === 'create').length;
    const reactivateCount = plans.filter(
      (plan) => plan.action === 'reactivate',
    ).length;
    const expectedActiveAfter = activeBefore + createCount + reactivateCount;

    console.log(
      `Preflight: country=${country} rows=${rows.length} approved=${approved.length} skipped=${skipped} create=${createCount} reactivate=${reactivateCount} already_present=${plans.length - createCount - reactivateCount}`,
    );
    console.log(
      `Preflight: active_before=${activeBefore} expected_after=${expectedActiveAfter}`,
    );
    plans.forEach((plan) => {
      console.log(
        `${apply ? 'APPLY' : 'DRY-RUN'} action=${plan.action} name="${plan.addition.name}" coordinates=${plan.addition.lat},${plan.addition.lon}`,
      );
    });

    if (!apply) {
      console.log(
        `Summary: mode=dry-run country=${country} create=${createCount} reactivate=${reactivateCount} active_expected=${expectedActiveAfter} database_changes=0`,
      );
      return;
    }

    const manifestDir = path.resolve('course-coordinate-manifests');
    fs.mkdirSync(manifestDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const manifestPath = path.join(
      manifestDir,
      `reviewed-course-additions-${country.toLowerCase()}-${timestamp}.json`,
    );
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          country,
          sourceFile: path.basename(filePath),
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

        let id = plan.existingId;
        if (plan.action === 'reactivate' && id) {
          await tx.course.update({
            where: { id },
            data: {
              city: plan.addition.city,
              region: plan.addition.region,
              postalCode: plan.addition.postalCode,
              holes: plan.addition.holes,
              website: plan.addition.website,
              source: 'manual_review_google_places',
              verified: true,
              active: true,
            },
          });
          reactivated++;
        } else {
          const inserted = await tx.course.create({
            data: {
              name: plan.addition.name,
              country,
              city: plan.addition.city,
              region: plan.addition.region,
              postalCode: plan.addition.postalCode,
              holes: plan.addition.holes,
              website: plan.addition.website,
              lat: plan.addition.lat,
              lon: plan.addition.lon,
              source: 'manual_review_google_places',
              verified: true,
              active: true,
            },
            select: { id: true },
          });
          id = inserted.id;
          created++;
        }

        if (!id) {
          throw new Error(`Missing course ID after ${plan.action}: ${plan.addition.name}`);
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Course"
          SET "location" = ST_SetSRID(
            ST_MakePoint(${plan.addition.lon}, ${plan.addition.lat}),
            4326
          )::geography
          WHERE "id" = ${id}
        `);
      }

      const count = await tx.course.count({ where: { country, active: true } });
      if (count !== expectedActiveAfter) {
        throw new Error(
          `Postflight active ${country} count mismatch: expected ${expectedActiveAfter}, found ${count}`,
        );
      }
      return count;
    });

    console.log(
      `Summary: mode=apply country=${country} created=${created} reactivated=${reactivated} active=${activeAfter}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
