import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient, CourseAccess } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL fehlt. Prüfe C:\\dev\\fairwayd\\apps\\api\\.env');
  process.exit(1);
}

// Driver Adapter (required because your Prisma client uses engineType "client")
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

// Prisma braucht bei dir eine nicht-leere Options-Struktur.
// Wir geben eine harmlose Option mit, DB-URL kommt aus DATABASE_URL.
const prisma = new PrismaClient({ log: ['error'] });

function norm(v: any): string {
  return String(v ?? '').trim();
}

function toFloat(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: any): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toAccess(v: any): CourseAccess | null {
  const s = norm(v).toUpperCase();
  if (!s) return null;

  // NOTE: Diese Enum-Namen (PUBLIC/PRIVATE/...) muessen zu deinem Prisma enum CourseAccess passen.
  // Wenn dein Enum anders heisst, schick mir kurz den enum-Block, dann passe ich es 1:1 an.
  if (s === 'PUBLIC' || s === 'ÖFFENTLICH' || s === 'OEFFENTLICH')
    return CourseAccess.PUBLIC as any;
  if (s === 'PRIVATE' || s === 'PRIVAT') return CourseAccess.PRIVATE as any;
  if (s === 'RESORT') return CourseAccess.RESORT as any;
  if (s === 'SEMI_PRIVATE' || s === 'SEMIPRIVATE')
    return CourseAccess.SEMI_PRIVATE as any;

  return null;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(
      'Usage: npx ts-node scripts/import-courses-csv.ts <path-to-cleaned.csv>',
    );
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const csv = fs.readFileSync(filePath, 'utf-8');

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Array<Record<string, any>>;

  let upserted = 0;
  let skipped = 0;

  for (const r of records) {
    const country = norm(r.country);
    const name = norm(r.name);
    const city = norm(r.city) || null;
    const postalCode = norm(r.postalCode) || null;
    const region = norm(r.region) || null;
    const website = norm(r.website) || null;

    const lat = toFloat(r.lat);
    const lon = toFloat(r.lon);

    const holes = toInt(r.holes);
    const access = toAccess(r.access);

    if (!country || !name || lat === null || lon === null) {
      skipped++;
      continue;
    }

    await prisma.course.upsert({
      where: {
        course_unique_import_key: {
          country,
          name,
          lat,
          lon,
        },
      },
      create: {
        country,
        name,
        city,
        postalCode,
        region,
        lat,
        lon,
        holes,
        access,
        website,
        source: 'csv',
        verified: false,
        active: true,
      },
      update: {
        city,
        postalCode,
        region,
        holes,
        access,
        website,
        active: true,
      },
    });

    upserted++;
  }

  console.log(`Upserted: ${upserted}`);
  console.log(`Skipped (missing country/name/lat/lon): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
