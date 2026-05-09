import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

type ExistingCourse = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
};

type ImportRow = Record<string, string | undefined>;

const commonNameWords =
  /\b(?:golf\s+club|golf\s+course|country\s+club|golf\s+resort|golf|course|club|resort|country|the)\b|\bg\.?\s*c\.?(?=\s|$)/g;

function norm(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeName(value: unknown) {
  return norm(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(commonNameWords, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFloat(value: unknown): number | null {
  const text = norm(value).replace(',', '.');
  if (!text) return null;

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function duplicateReason(row: {
  name: string;
  lat: number;
  lon: number;
}, existingCourses: ExistingCourse[]) {
  const normalizedName = normalizeName(row.name);

  for (const course of existingCourses) {
    const distance = distanceKm(
      { lat: row.lat, lon: row.lon },
      { lat: course.lat, lon: course.lon },
    );
    const normalizedCourseName = normalizeName(course.name);
    const nameRelated =
      !!normalizedName &&
      !!normalizedCourseName &&
      (normalizedName === normalizedCourseName ||
        normalizedName.includes(normalizedCourseName) ||
        normalizedCourseName.includes(normalizedName));

    if (
      course.name.trim().toLowerCase() === row.name.trim().toLowerCase() &&
      distance < 0.01
    ) {
      return `same name and coordinates as existing course "${course.name}"`;
    }

    if (nameRelated && distance < 0.1) {
      return `normalized name matches existing course "${course.name}" within 100m`;
    }

    if (distance < 0.03) {
      return `coordinates are within 30m of existing course "${course.name}"`;
    }
  }

  return null;
}

async function main() {
  const fileArg = process.argv[2];
  const countryArg = norm(process.argv[3]).toUpperCase();

  if (!fileArg || !countryArg) {
    console.error(
      'Usage: npx ts-node scripts/import-missing-course-candidates.ts <csv-path> <countryCode>',
    );
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const records = parse(fs.readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as ImportRow[];

  const existingCourses = await prisma.course.findMany({
    where: { country: countryArg },
    select: { id: true, name: true, country: true, lat: true, lon: true },
  });

  let imported = 0;
  let skippedAction = 0;
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  const warnings: string[] = [];
  const importedNames: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 2;
    const action = norm(row.suggestedAction);

    if (action !== 'missing_candidate') {
      skippedAction++;
      continue;
    }

    const name = norm(row.name);
    const lat = toFloat(row.lat);
    const lon = toFloat(row.lon);

    if (!name || lat === null || lon === null) {
      skippedInvalid++;
      warnings.push(`Row ${rowNumber}: skipped missing name/lat/lon`);
      continue;
    }

    const reason = duplicateReason({ name, lat, lon }, existingCourses);
    if (reason) {
      skippedDuplicate++;
      warnings.push(`Row ${rowNumber}: skipped duplicate risk: ${reason}`);
      continue;
    }

    const course = await prisma.course.create({
      data: {
        country: countryArg,
        name,
        city: norm(row.city) || null,
        region: norm(row.region) || null,
        lat,
        lon,
        website: norm(row.website) || null,
        phone: norm(row.phone) || null,
        source: 'google_places_missing_review',
        verified: false,
        active: true,
      },
      select: { id: true, name: true, lat: true, lon: true },
    });

    existingCourses.push({
      id: course.id,
      name: course.name,
      country: countryArg,
      lat: course.lat,
      lon: course.lon,
    });
    imported++;

    if (importedNames.length < 10) {
      importedNames.push(course.name);
    }
  }

  console.log(`Parsed rows: ${records.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped non-missing actions: ${skippedAction}`);
  console.log(`Skipped invalid rows: ${skippedInvalid}`);
  console.log(`Skipped duplicate risks: ${skippedDuplicate}`);
  console.log(`Warnings: ${warnings.length}`);
  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
  console.log('Sample imported courses:');
  for (const name of importedNames) {
    console.log(`  - ${name}`);
  }
}

main()
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
