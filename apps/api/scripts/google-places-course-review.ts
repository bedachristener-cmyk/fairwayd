import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

if (!googleApiKey) {
  console.error('GOOGLE_MAPS_API_KEY is missing. Check apps/api/.env');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

type CourseForReview = {
  id: string;
  country: string;
  name: string;
  city: string | null;
  region: string | null;
  lat: number;
  lon: number;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  types?: string[];
};

function norm(value: unknown): string {
  return String(value ?? '').trim();
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
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

function buildQuery(course: CourseForReview) {
  return [course.name, course.city, course.region, 'golf course']
    .filter(Boolean)
    .join(' ');
}

function confidenceReason(course: CourseForReview, place?: GooglePlace) {
  if (!place) return 'no result';

  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return 'missing candidate coordinates';
  }

  const text = [
    place.displayName?.text,
    place.formattedAddress,
    ...(place.types ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const nameTokens = course.name
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 4 && token !== 'golf');
  const matchedNameTokens = nameTokens.filter((token) =>
    text.includes(token),
  ).length;
  const nameMatch =
    nameTokens.length === 0 ||
    matchedNameTokens >= Math.min(2, nameTokens.length);
  const golfMatch =
    text.includes('golf') ||
    (place.types ?? []).some((type) => type.toLowerCase().includes('golf'));
  const distance = distanceKm(
    { lat: course.lat, lon: course.lon },
    { lat: lat as number, lon: lon as number },
  );

  return [
    nameMatch ? 'name match' : 'weak name match',
    golfMatch ? 'golf match' : 'weak golf match',
    `distance ${distance.toFixed(1)}km`,
  ].join('; ');
}

async function textSearch(query: string, country: string) {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey as string,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.types',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        regionCode: country,
        maxResultCount: 3,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error('Google Places request failed');
    console.error(`Status: ${response.status}`);
    console.error(`Status text: ${response.statusText}`);
    console.error(`Response body: ${body}`);
    return undefined;
  }

  const json = (await response.json()) as { places?: GooglePlace[] };
  return Array.isArray(json.places) ? json.places[0] : undefined;
}

async function main() {
  const country = norm(process.argv[2]).toUpperCase();
  const limitArg = Number(process.argv[3] || 10);
  const dryRun = process.argv.includes('--dry-run');

  if (!country || !dryRun) {
    console.error(
      'Usage: npx ts-node scripts/google-places-course-review.ts <countryCode> <limit> --dry-run',
    );
    process.exit(1);
  }

  const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : 10;
  const outputPath = path.resolve(
    `data/review/${country.toLowerCase()}-google-places-candidates.csv`,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const courses = await prisma.course.findMany({
    where: { country, active: true },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
    take: limit,
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

  const rows = [
    [
      'id',
      'name',
      'city',
      'region',
      'currentLat',
      'currentLon',
      'googleLat',
      'googleLon',
      'placeId',
      'displayName',
      'formattedAddress',
      'googleMapsUri',
      'distanceKm',
      'confidenceReason',
    ].join(','),
  ];

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    let place: GooglePlace | undefined;

    try {
      place = await textSearch(buildQuery(course), country);
    } catch (error: any) {
      console.error(
        `Google Places error for ${course.name}: ${error?.message ?? error}`,
      );
      place = undefined;
    }

    const googleLat = place?.location?.latitude ?? null;
    const googleLon = place?.location?.longitude ?? null;
    const distance =
      Number.isFinite(googleLat) && Number.isFinite(googleLon)
        ? distanceKm(
            { lat: course.lat, lon: course.lon },
            { lat: googleLat as number, lon: googleLon as number },
          )
        : null;

    rows.push(
      [
        course.id,
        course.name,
        course.city,
        course.region,
        course.lat,
        course.lon,
        googleLat,
        googleLon,
        place?.id,
        place?.displayName?.text,
        place?.formattedAddress,
        place?.googleMapsUri,
        distance === null ? '' : distance.toFixed(2),
        confidenceReason(course, place),
      ]
        .map(csvCell)
        .join(','),
    );

    console.log(`Reviewed ${i + 1}/${courses.length}: ${course.name}`);
  }

  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf-8');
  console.log(`Exported: ${courses.length}`);
  console.log(`Output: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
