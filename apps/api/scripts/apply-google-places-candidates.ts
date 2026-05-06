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

type CandidateRow = {
  id?: string;
  name?: string;
  city?: string;
  region?: string;
  googleLat?: string;
  googleLon?: string;
  displayName?: string;
  formattedAddress?: string;
  distanceKm?: string;
  confidenceReason?: string;
};

type AuditRow = {
  id: string;
  name: string;
  oldLat: number;
  oldLon: number;
  newLat: number;
  newLon: number;
  distanceKm: string;
  displayName: string;
  mode: 'dry-run' | 'applied';
};

function norm(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeForMatch(value: unknown): string {
  return norm(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const GENERIC_NAME_WORDS = new Set([
  'golf',
  'club',
  'course',
  'campo',
  'de',
  'del',
  'la',
  'el',
  'resort',
  'country',
]);

function matchTokens(value: unknown): string[] {
  return normalizeForMatch(value)
    .split(' ')
    .filter((token) => token && !GENERIC_NAME_WORDS.has(token));
}

function tokenContainsAll(haystack: string[], needles: string[]) {
  return needles.every((needle) => haystack.includes(needle));
}

function hasStrongNameMatch(row: CandidateRow) {
  const nameTokens = matchTokens(row.name);
  const displayTokens = matchTokens(row.displayName);
  if (nameTokens.length === 0 || displayTokens.length === 0) return false;

  if (tokenContainsAll(displayTokens, nameTokens)) return true;

  const parentheticalMatches = [...norm(row.displayName).matchAll(/\(([^)]+)\)/g)]
    .flatMap((match) => matchTokens(match[1]))
    .filter(Boolean);

  return (
    parentheticalMatches.length > 0 &&
    tokenContainsAll(parentheticalMatches, nameTokens)
  );
}

function addressText(row: CandidateRow) {
  return normalizeForMatch([row.displayName, row.formattedAddress].join(' '));
}

function hasSpainAddress(row: CandidateRow) {
  const text = addressText(row);
  return (
    text.includes('spain') ||
    text.includes('espana') ||
    text.includes('espa a') ||
    text.includes('illes balears') ||
    text.includes('balearic') ||
    text.includes('tenerife') ||
    text.includes('gran canaria') ||
    text.includes('las palmas')
  );
}

function hasRegionSafety(row: CandidateRow) {
  const region = normalizeForMatch(row.region);
  const text = addressText(row);
  const includesAny = (values: string[]) =>
    values.some((value) => text.includes(normalizeForMatch(value)));

  if (region === 'mallorca') {
    return includesAny([
      'Mallorca',
      'Illes Balears',
      'Balearic',
      'Palma',
      'Alcudia',
      'Arta',
      'Son Vida',
      'Calvia',
      'Capdepera',
    ]);
  }

  if (region === 'tenerife') {
    return includesAny(['Tenerife', 'Santa Cruz de Tenerife']);
  }

  if (region === 'gran canaria') {
    return includesAny(['Gran Canaria', 'Las Palmas']);
  }

  return true;
}

function toFloat(value: unknown): number | null {
  const n = Number(norm(value));
  return Number.isFinite(n) ? n : null;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function isClearlyUnrelated(row: CandidateRow) {
  const name = normalizeForMatch(row.name);
  const displayName = normalizeForMatch(row.displayName);
  if (!name || !displayName) return true;

  const tokens = name
    .split(' ')
    .filter((token) => token.length >= 4 && token !== 'golf');
  if (tokens.length === 0) return false;

  const matched = tokens.filter((token) => displayName.includes(token)).length;
  return matched === 0;
}

function skipReason(row: CandidateRow, maxDistanceKm: number): string | null {
  const googleLat = toFloat(row.googleLat);
  const googleLon = toFloat(row.googleLon);
  const distanceKm = toFloat(row.distanceKm);
  const confidenceReason = norm(row.confidenceReason).toLowerCase();

  if (!norm(row.id)) return 'missing id';
  if (googleLat === null || googleLon === null) return 'invalid google lat/lon';
  if (distanceKm === null) return 'invalid distanceKm';
  if (distanceKm > 3) return `distanceKm > 3 (${distanceKm})`;
  if (distanceKm > maxDistanceKm) {
    return `distanceKm > ${maxDistanceKm} (${distanceKm})`;
  }
  if (!confidenceReason.includes('name match')) {
    return 'confidenceReason missing name match';
  }
  if (!confidenceReason.includes('golf match')) {
    return 'confidenceReason missing golf match';
  }
  if (confidenceReason.includes('weak name match')) {
    return 'confidenceReason contains weak name match';
  }
  if (isClearlyUnrelated(row)) {
    return 'displayName appears unrelated to name';
  }

  return null;
}

function strongPlaceMatchSkipReason(row: CandidateRow): string | null {
  const googleLat = toFloat(row.googleLat);
  const googleLon = toFloat(row.googleLon);
  const distanceKm = toFloat(row.distanceKm);
  const confidenceReason = norm(row.confidenceReason).toLowerCase();

  if (!norm(row.id)) return 'missing id';
  if (googleLat === null || googleLon === null) return 'invalid google lat/lon';
  if (!confidenceReason.includes('golf match')) {
    return 'confidenceReason missing golf match';
  }
  if (!norm(row.displayName)) return 'missing displayName';
  if (!hasStrongNameMatch(row)) return 'displayName/name not strong match';
  if (!hasRegionSafety(row)) return 'candidate address failed region safety';
  if (!hasSpainAddress(row)) return 'candidate address does not look like Spain';
  if (isClearlyUnrelated(row)) {
    return 'displayName appears unrelated to name';
  }

  if (distanceKm !== null && distanceKm > 5) {
    return null;
  }

  return null;
}

async function main() {
  const fileArg = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  const maxDistanceIndex = process.argv.indexOf('--max-distance-km');
  const maxDistanceArg =
    maxDistanceIndex >= 0 ? process.argv[maxDistanceIndex + 1] : undefined;
  const maxDistanceKm =
    maxDistanceArg === undefined ? 0.1 : Number(maxDistanceArg);
  const regionIndex = process.argv.indexOf('--region');
  const regionFilter =
    regionIndex >= 0 ? norm(process.argv[regionIndex + 1]) : undefined;
  const confidenceModeIndex = process.argv.indexOf('--confidence-mode');
  const confidenceMode =
    confidenceModeIndex >= 0
      ? norm(process.argv[confidenceModeIndex + 1])
      : 'default';
  const forceGoogleCoordinates = process.argv.includes(
    '--force-google-coordinates',
  );

  if (!fileArg) {
    console.error(
      'Usage: npx ts-node scripts/apply-google-places-candidates.ts <csv-path> [--dry-run]',
    );
    process.exit(1);
  }

  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    console.error('--max-distance-km must be a positive number');
    process.exit(1);
  }

  if (regionIndex >= 0 && !regionFilter) {
    console.error('--region requires a non-empty value');
    process.exit(1);
  }

  if (
    confidenceMode !== 'default' &&
    confidenceMode !== 'strong-place-match'
  ) {
    console.error(
      '--confidence-mode must be omitted or set to strong-place-match',
    );
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(filePath, 'utf-8');
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CandidateRow[];

  let wouldUpdate = 0;
  let updated = 0;
  let skipped = 0;
  let warnings = 0;
  const highRiskRows: string[] = [];
  const auditRows: AuditRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (regionFilter && norm(row.region) !== regionFilter) {
      skipped++;
      continue;
    }

    const reason = forceGoogleCoordinates
      ? (() => {
          if (!norm(row.id)) return 'missing id';
          if (toFloat(row.googleLat) === null || toFloat(row.googleLon) === null) {
            return 'invalid google lat/lon';
          }
          return null;
        })()
      : confidenceMode === 'strong-place-match'
        ? strongPlaceMatchSkipReason(row)
        : skipReason(row, maxDistanceKm);

    if (reason) {
      skipped++;
      warnings++;
      const summary = `Row ${i + 2}: ${row.name || '<missing name>'} (${row.id || '<missing id>'}) - ${reason}`;
      highRiskRows.push(summary);
      continue;
    }

    const id = norm(row.id);
    const lat = toFloat(row.googleLat);
    const lon = toFloat(row.googleLon);
    const existing = await prisma.course.findUnique({
      where: { id },
      select: { id: true, name: true, lat: true, lon: true },
    });

    if (lat === null || lon === null) {
      skipped++;
      warnings++;
      highRiskRows.push(
        `Row ${i + 2}: ${row.name || '<missing name>'} (${id}) - invalid coordinates after validation`,
      );
      continue;
    }

    if (!existing) {
      skipped++;
      warnings++;
      highRiskRows.push(
        `Row ${i + 2}: ${row.name || '<missing name>'} (${id}) - course not found`,
      );
      continue;
    }

    auditRows.push({
      id,
      name: existing.name,
      oldLat: existing.lat,
      oldLon: existing.lon,
      newLat: lat,
      newLon: lon,
      distanceKm: norm(row.distanceKm),
      displayName: norm(row.displayName),
      mode: dryRun ? 'dry-run' : 'applied',
    });

    console.log(
      `UPDATED: ${existing.name} ${existing.lat},${existing.lon} -> ${lat},${lon}`,
    );
    const distanceKm = toFloat(row.distanceKm);
    if (
      confidenceMode === 'strong-place-match' &&
      distanceKm !== null &&
      distanceKm > 5
    ) {
      warnings++;
      console.warn(
        `Warning: ${existing.name} candidate is ${distanceKm}km from old coordinate`,
      );
    }

    if (dryRun) {
      wouldUpdate++;
      continue;
    }

    await prisma.course.update({
      where: { id },
      data: { lat, lon },
    });
    updated++;
  }

  console.log(`Parsed: ${rows.length}`);
  console.log(`Would update: ${wouldUpdate}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Warnings: ${warnings}`);

  if (highRiskRows.length > 0) {
    console.log('Skipped high-risk rows:');
    for (const row of highRiskRows) {
      console.log(`- ${row}`);
    }
  }

  const auditPath = path.resolve(
    'data/review/google-places-applied-audit.csv',
  );
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.writeFileSync(
    auditPath,
    [
      [
        'id',
        'name',
        'oldLat',
        'oldLon',
        'newLat',
        'newLon',
        'distanceKm',
        'displayName',
        'mode',
      ].join(','),
      ...auditRows.map((row) =>
        [
          row.id,
          row.name,
          row.oldLat,
          row.oldLon,
          row.newLat,
          row.newLon,
          row.distanceKm,
          row.displayName,
          row.mode,
        ]
          .map(csvCell)
          .join(','),
      ),
    ].join('\n') + '\n',
    'utf-8',
  );
  console.log(`Audit: ${auditPath}`);
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
