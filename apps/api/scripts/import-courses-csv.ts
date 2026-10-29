import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient, CourseAccess } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const databaseUrlSource = process.env.NEON_DATABASE_URL
  ? 'NEON_DATABASE_URL'
  : 'DATABASE_URL';

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const activeConnectionString = connectionString;

function describeDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//***:***@${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}

function databaseHostAndName(value: string): { host: string; database: string } {
  try {
    const url = new URL(value);
    return {
      host: url.hostname || '<unknown>',
      database: url.pathname.replace(/^\//, '') || '<unknown>',
    };
  } catch {
    return { host: '<unknown>', database: '<unknown>' };
  }
}

// Driver Adapter (required because the Prisma client uses engineType "client")
const pool = new Pool({ connectionString: activeConnectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

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

  if (
    s === 'PUBLIC' ||
    s === 'ÖFFENTLICH' ||
    s === 'OFFENTLICH' ||
    s === 'OEFFENTLICH'
  ) {
    return CourseAccess.PUBLIC as any;
  }
  if (s === 'PRIVATE' || s === 'PRIVAT') return CourseAccess.PRIVATE as any;
  if (s === 'RESORT') return CourseAccess.RESORT as any;
  if (s === 'SEMI_PRIVATE' || s === 'SEMIPRIVATE') {
    return CourseAccess.SEMI_PRIVATE as any;
  }

  return null;
}

function skipReason(row: {
  country: string;
  name: string;
  lat: number | null;
  lon: number | null;
}): string | null {
  const missing: string[] = [];
  if (!row.country) missing.push('country');
  if (!row.name) missing.push('name');
  if (row.lat === null) missing.push('lat');
  if (row.lon === null) missing.push('lon');

  return missing.length
    ? `missing required field(s): ${missing.join(', ')}`
    : null;
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
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const db = databaseHostAndName(activeConnectionString);
  console.log(`Database URL source: ${databaseUrlSource}`);
  console.log(`Database: host=${db.host} db=${db.database}`);
  console.log(`Database URL: ${describeDatabaseUrl(activeConnectionString)}`);
  console.log(`CSV path: ${filePath}`);

  const csv = fs.readFileSync(filePath, 'utf-8');

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Array<Record<string, any>>;

  console.log(`Parsed rows: ${records.length}`);

  let upserted = 0;
  let skipped = 0;
  const upsertedByCountry = new Map<string, number>();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    const country = norm(r.country).toUpperCase();
    const name = norm(r.name);
    const city = norm(r.city) || null;
    const postalCode = norm(r.postalCode) || null;
    const region = norm(r.region) || null;
    const website = norm(r.website) || null;

    const lat = toFloat(r.lat);
    const lon = toFloat(r.lon);

    const holes = toInt(r.holes);
    const access = toAccess(r.access);

    const reason = skipReason({ country, name, lat, lon });
    if (reason) {
      skipped++;
      console.warn(`Skipped row ${i + 1}: ${reason}`);
      continue;
    }

    if (lat === null || lon === null) {
      throw new Error(`Unexpected missing coordinates after validation at row ${i + 1}`);
    }

    const latValue = lat;
    const lonValue = lon;

    try {
      await prisma.course.upsert({
        where: {
          course_unique_import_key: {
            country,
            name,
            lat: latValue,
            lon: lonValue,
          },
        },
        create: {
          country,
          name,
          city,
          postalCode,
          region,
          lat: latValue,
          lon: lonValue,
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
      upsertedByCountry.set(country, (upsertedByCountry.get(country) ?? 0) + 1);

      if (upserted % 1000 === 0) {
        console.log(
          `Upserted so far: ${upserted} (row ${i + 1}/${records.length})`,
        );
      }
    } catch (e: any) {
      console.error(
        `Upsert failed at row ${i + 1} (country="${country}", name="${name}")`,
        e?.message ?? e,
      );
      throw e;
    }
  }

  console.log('Done.');
  console.log(`Upserted: ${upserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log('Upserted by country:');
  for (const [country, count] of [...upsertedByCountry.entries()].sort()) {
    console.log(`  ${country}: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    try {
      await pool.end();
    } catch {}
  });
