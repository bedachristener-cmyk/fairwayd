import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient, CourseAccess } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

type ParsedCourse = {
  rowNumber: number;
  country: string;
  name: string;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  holes: number | null;
  access: CourseAccess;
  website: string | null;
  lat: number;
  lon: number;
};

function norm(value: unknown): string {
  return String(value ?? '').trim();
}

function toFloat(value: unknown): number | null {
  const n = Number(norm(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toInt(value: unknown): number | null {
  const s = norm(value);
  if (!s) return null;

  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function mapAccess(
  value: unknown,
  rowNumber: number,
  warnings: string[],
): CourseAccess {
  const raw = norm(value);
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'public') return CourseAccess.PUBLIC;
  if (normalized === 'private') return CourseAccess.PRIVATE;
  if (normalized === 'resort') return CourseAccess.RESORT;
  if (normalized === 'municipal') return CourseAccess.MUNICIPAL;
  if (normalized === 'semi_private') return CourseAccess.SEMI_PRIVATE;

  warnings.push(
    `Row ${rowNumber}: unknown access "${raw || '<empty>'}", using PUBLIC`,
  );
  return CourseAccess.PUBLIC;
}

function parseRows(filePath: string, country: string) {
  const warnings: string[] = [];
  const skippedRows: string[] = [];
  const rows: ParsedCourse[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const rowNumber = index + 1;
    const [
      fileCountry,
      nameValue,
      cityValue,
      postalCodeValue,
      regionValue,
      holesValue,
      accessValue,
      websiteValue,
      latValue,
      lonValue,
    ] = line.split(',').map((value) => value.trim());

    const name = norm(nameValue);
    if (!name) {
      skippedRows.push(`Row ${rowNumber}: missing name`);
      return;
    }

    const lat = toFloat(latValue);
    const lon = toFloat(lonValue);
    if (lat === null || lon === null) {
      skippedRows.push(`Row ${rowNumber}: invalid lat/lon`);
      return;
    }

    if (norm(fileCountry).toUpperCase() !== country) {
      warnings.push(
        `Row ${rowNumber}: file country "${norm(fileCountry)}" ignored, using ${country}`,
      );
    }

    rows.push({
      rowNumber,
      country,
      name,
      city: norm(cityValue) || null,
      postalCode: norm(postalCodeValue) || null,
      region: norm(regionValue) || null,
      holes: toInt(holesValue),
      access: mapAccess(accessValue, rowNumber, warnings),
      website: norm(websiteValue) || null,
      lat,
      lon,
    });
  });

  return { parsed: lines.length, rows, skippedRows, warnings };
}

async function main() {
  const fileArg = process.argv[2];
  const countryArg = norm(process.argv[3]).toUpperCase();

  if (!fileArg || !countryArg) {
    console.error(
      'Usage: npx ts-node scripts/import-country-courses.ts <csv-path> <countryCode>',
    );
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const { parsed, rows, skippedRows, warnings } = parseRows(
    filePath,
    countryArg,
  );

  let inserted = 0;
  let updated = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const row of rows) {
        const existing = await tx.course.findFirst({
          where: {
            country: row.country,
            name: row.name,
            city: row.city,
          },
          select: { id: true },
        });

        if (existing) {
          updated++;
        } else {
          inserted++;
        }

        await tx.course.upsert({
          where: { id: existing?.id ?? randomUUID() },
          create: {
            country: row.country,
            name: row.name,
            city: row.city,
            postalCode: row.postalCode,
            region: row.region,
            holes: row.holes,
            access: row.access,
            website: row.website,
            lat: row.lat,
            lon: row.lon,
            source: 'csv',
            verified: false,
            active: true,
          },
          update: {
            lat: row.lat,
            lon: row.lon,
            region: row.region,
            postalCode: row.postalCode,
            holes: row.holes,
            access: row.access,
            website: row.website,
            active: true,
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
  for (const skipped of skippedRows) {
    console.warn(`Skipped: ${skipped}`);
  }

  console.log(`Parsed: ${parsed}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skippedRows.length}`);
  console.log(`Warnings: ${warnings.length}`);
}

main()
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  });
