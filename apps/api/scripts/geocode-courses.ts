import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
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

type CourseForGeocode = {
  id: string;
  country: string;
  name: string;
  city: string | null;
  region: string | null;
  lat: number;
  lon: number;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  class?: string;
  type?: string;
  importance?: number;
};

type ConfidenceReview = {
  ok: boolean;
  reason: string;
  candidateLat: number | null;
  candidateLon: number | null;
  distance: number | null;
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

function toFloat(value: unknown): number | null {
  const n = Number(value);
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

function buildQuery(course: CourseForGeocode) {
  return [course.name, course.city, course.region, 'golf course']
    .filter(Boolean)
    .join(' ');
}

function reviewConfidence(
  course: CourseForGeocode,
  result?: NominatimResult,
): ConfidenceReview {
  if (!result) {
    return {
      ok: false,
      reason: 'no result',
      candidateLat: null,
      candidateLon: null,
      distance: null,
    };
  }

  const lat = toFloat(result.lat);
  const lon = toFloat(result.lon);
  if (lat === null || lon === null) {
    return {
      ok: false,
      reason: 'invalid candidate coordinates',
      candidateLat: lat,
      candidateLon: lon,
      distance: null,
    };
  }

  const displayName = normalizeForMatch(result.display_name);
  const courseName = normalizeForMatch(course.name);
  const city = normalizeForMatch(course.city);
  const region = normalizeForMatch(course.region);
  const importance = Number(result.importance ?? 0);
  const resultClass = normalizeForMatch(result.class);
  const resultType = normalizeForMatch(result.type);

  const nameTokens = courseName
    .split(' ')
    .filter((token) => token.length >= 4 && token !== 'golf');
  const matchedNameTokens = nameTokens.filter((token) =>
    displayName.includes(token),
  ).length;
  const nameMatch =
    nameTokens.length === 0 ||
    matchedNameTokens >= Math.min(2, nameTokens.length);
  const placeMatch =
    !city ||
    displayName.includes(city) ||
    (!!region && displayName.includes(region));
  const golfMatch =
    displayName.includes('golf') ||
    resultType.includes('golf') ||
    resultClass.includes('leisure');
  const distance = distanceKm(
    { lat: course.lat, lon: course.lon },
    { lat, lon },
  );
  const saneDistance = distance <= 75;
  const reasons = [
    nameMatch ? 'name match' : 'weak name match',
    placeMatch ? 'place match' : 'weak place match',
    golfMatch ? 'golf match' : 'weak golf match',
    saneDistance ? `distance ${distance.toFixed(1)}km` : `far ${distance.toFixed(1)}km`,
    importance > 0 ? `importance ${importance}` : 'no importance',
  ];

  return {
    ok: nameMatch && placeMatch && golfMatch && saneDistance && importance > 0,
    reason: reasons.join('; '),
    candidateLat: lat,
    candidateLon: lon,
    distance,
  };
}

function isHighConfidence(course: CourseForGeocode, result: NominatimResult) {
  return reviewConfidence(course, result).ok;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function googleMapsUrl(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lon}`,
  )}`;
}

function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

async function geocode(query: string, country: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', country.toLowerCase());

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        process.env.NOMINATIM_USER_AGENT ||
        'Fairwayd course coordinate review (contact: admin@fairwayd.com)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status}`);
  }

  const json = (await res.json()) as NominatimResult[];
  return Array.isArray(json) ? json[0] : undefined;
}

async function main() {
  const country = norm(process.argv[2]).toUpperCase() || undefined;
  const limit = Number(process.argv[3] || 0);
  const dryRun = process.argv.includes('--dry-run');
  const exportReviewIndex = process.argv.indexOf('--export-review');
  const exportReviewPath =
    exportReviewIndex >= 0 ? process.argv[exportReviewIndex + 1] : undefined;
  const exportRows: string[] = [];

  if (exportReviewIndex >= 0 && !exportReviewPath) {
    console.error(
      'Usage: npx ts-node scripts/geocode-courses.ts <country> [limit] --export-review <output-csv-path>',
    );
    process.exit(1);
  }

  const courses = await prisma.course.findMany({
    where: {
      active: true,
      ...(country ? { country } : {}),
    },
    orderBy: [{ country: 'asc' }, { name: 'asc' }],
    take: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    select: {
      id: true,
      country: true,
      name: true,
      city: true,
      region: true,
      lat: true,
      lon: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Courses: ${courses.length}`);
  console.log(
    `Mode: ${exportReviewPath ? 'export-review' : dryRun ? 'dry-run' : 'update'}`,
  );

  if (exportReviewPath) {
    exportRows.push(
      [
        'id',
        'name',
        'city',
        'region',
        'currentLat',
        'currentLon',
        'candidateLat',
        'candidateLon',
        'distanceKm',
        'resultDisplayName',
        'resultType',
        'resultClass',
        'confidenceReason',
        'googleCurrentUrl',
        'googleCandidateUrl',
        'googleSearchUrl',
      ].join(','),
    );
  }

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const query = buildQuery(course);

    try {
      const result = await geocode(query, course.country);
      await sleep(1100);
      const confidence = reviewConfidence(course, result);

      if (exportReviewPath) {
        exportRows.push(
          [
            course.id,
            course.name,
            course.city,
            course.region,
            course.lat,
            course.lon,
            confidence.candidateLat,
            confidence.candidateLon,
            confidence.distance === null ? '' : confidence.distance.toFixed(2),
            result?.display_name,
            result?.type,
            result?.class,
            confidence.reason,
            googleMapsUrl(course.lat, course.lon),
            googleMapsUrl(confidence.candidateLat, confidence.candidateLon),
            googleSearchUrl(query),
          ]
            .map(csvCell)
            .join(','),
        );

        if (confidence.ok) {
          updated++;
        } else {
          skipped++;
        }
        console.log(`Reviewed ${i + 1}/${courses.length}: ${course.name}`);
        continue;
      }

      if (!result || !isHighConfidence(course, result)) {
        skipped++;
        console.log(`Skipped ${i + 1}/${courses.length}: ${course.name}`);
        continue;
      }

      const lat = toFloat(result.lat);
      const lon = toFloat(result.lon);
      if (lat === null || lon === null) {
        skipped++;
        console.log(`Skipped ${i + 1}/${courses.length}: ${course.name}`);
        continue;
      }

      if (!dryRun) {
        await prisma.course.update({
          where: { id: course.id },
          data: { lat, lon },
        });
      }

      updated++;
      console.log(
        `${dryRun ? 'Would update' : 'Updated'} ${i + 1}/${courses.length}: ${
          course.name
        } -> ${lat},${lon}`,
      );
    } catch (err: any) {
      errors++;
      console.warn(
        `Error ${i + 1}/${courses.length}: ${course.name}: ${
          err?.message ?? err
        }`,
      );
      await sleep(1100);
    }
  }

  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (exportReviewPath) {
    const outputPath = path.resolve(exportReviewPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${exportRows.join('\n')}\n`, 'utf-8');
    console.log(`Review export: ${outputPath}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
