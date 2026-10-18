import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  buildDiscoveryGrid,
  classifyDiscoveredCourse,
  courseDistanceKm,
  nearestCourse,
  type CourseDiscoveryPoint,
} from '../src/courses/course-completeness-review';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const googleApiKey =
  process.env.GOOGLE_PLACES_REVIEW_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

if (!googleApiKey) {
  console.error(
    'GOOGLE_PLACES_REVIEW_API_KEY or GOOGLE_MAPS_API_KEY is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

const SWITZERLAND_BOUNDS = {
  minLat: 45.82,
  maxLat: 47.82,
  minLon: 5.96,
  maxLon: 10.5,
};
const GRID_LAT_STEP = 0.25;
const GRID_LON_STEP = 0.36;
const SEARCH_RADIUS_METERS = 22_000;
const MAX_RESULTS_PER_CELL = 20;

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  addressComponents?: AddressComponent[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

type ExistingCourse = CourseDiscoveryPoint & {
  city: string | null;
  region: string | null;
};

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function countryCode(place: GooglePlace): string {
  const component = place.addressComponents?.find((item) =>
    item.types?.includes('country'),
  );
  return String(component?.shortText ?? '').trim().toUpperCase();
}

function validPlace(place: GooglePlace): place is GooglePlace & {
  id: string;
  location: { latitude: number; longitude: number };
} {
  return (
    Boolean(place.id) &&
    Number.isFinite(place.location?.latitude) &&
    Number.isFinite(place.location?.longitude)
  );
}

async function nearbySearch(center: { lat: number; lon: number }) {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey as string,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.googleMapsUri',
      },
      body: JSON.stringify({
        includedTypes: ['golf_course'],
        maxResultCount: MAX_RESULTS_PER_CELL,
        rankPreference: 'DISTANCE',
        languageCode: 'en',
        regionCode: 'CH',
        locationRestriction: {
          circle: {
            center: {
              latitude: center.lat,
              longitude: center.lon,
            },
            radius: SEARCH_RADIUS_METERS,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    let detail = response.statusText || 'request rejected';
    try {
      const body = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail =
        [body.error?.status, body.error?.message].filter(Boolean).join(': ') ||
        detail;
    } catch {
      // Keep the HTTP status text when Google did not return JSON.
    }
    throw new Error(
      `Google Places request failed: ${response.status} ${detail}`,
    );
  }

  const body = (await response.json()) as { places?: GooglePlace[] };
  return Array.isArray(body.places) ? body.places : [];
}

async function main() {
  const country = String(process.argv[2] ?? '')
    .trim()
    .toUpperCase();
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes(
    '--confirm-google-places-requests',
  );

  if (country !== 'CH' || !dryRun || !confirmed) {
    console.error(
      'Usage: npx ts-node scripts/google-places-course-discovery.ts CH --dry-run --confirm-google-places-requests',
    );
    process.exit(1);
  }

  const centers = buildDiscoveryGrid(
    SWITZERLAND_BOUNDS,
    GRID_LAT_STEP,
    GRID_LON_STEP,
  );
  console.log(
    `Read-only discovery: country=CH requests=${centers.length} radius_km=${SEARCH_RADIUS_METERS / 1000}`,
  );

  const courses = (await prisma.course.findMany({
    where: { country: 'CH', active: true },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
    select: {
      id: true,
      name: true,
      city: true,
      region: true,
      lat: true,
      lon: true,
    },
  })) as ExistingCourse[];

  const placesById = new Map<string, GooglePlace>();
  const saturatedCells: string[] = [];
  let discardedOutsideSwitzerland = 0;

  for (let index = 0; index < centers.length; index++) {
    const center = centers[index];
    const places = await nearbySearch(center);

    if (places.length === MAX_RESULTS_PER_CELL) {
      saturatedCells.push(`${center.lat},${center.lon}`);
    }

    for (const place of places) {
      if (!validPlace(place)) continue;
      if (countryCode(place) !== 'CH') {
        discardedOutsideSwitzerland++;
        continue;
      }
      placesById.set(place.id, place);
    }

    if ((index + 1) % 10 === 0 || index + 1 === centers.length) {
      console.log(
        `Queried ${index + 1}/${centers.length} cells; unique_CH_places=${placesById.size}`,
      );
    }
  }

  const outputPath = path.resolve(
    'course-audits/ch-google-places-discovery.csv',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const header = [
    'recordType',
    'status',
    'placeId',
    'googleName',
    'formattedAddress',
    'googleLat',
    'googleLon',
    'googleMapsUri',
    'nearestCourseId',
    'nearestCourseName',
    'nearestCourseCity',
    'nearestDistanceKm',
    'reviewDecision',
    'reviewNotes',
  ];
  const rows = [header.join(',')];
  const matchedCourseIds = new Set<string>();
  const statusCounts = {
    MATCHED: 0,
    REVIEW_NEARBY: 0,
    POSSIBLE_MISSING: 0,
    DATABASE_ONLY: 0,
  };

  const places = [...placesById.values()].sort((a, b) =>
    String(a.displayName?.text ?? '').localeCompare(
      String(b.displayName?.text ?? ''),
    ),
  );

  for (const place of places) {
    if (!validPlace(place)) continue;
    const match = nearestCourse(
      {
        lat: place.location.latitude,
        lon: place.location.longitude,
      },
      courses,
    );
    const status = match
      ? classifyDiscoveredCourse(match.distanceKm)
      : 'POSSIBLE_MISSING';

    statusCounts[status]++;
    if (match && status === 'MATCHED') {
      matchedCourseIds.add(match.course.id);
    }

    const course = match
      ? courses.find((item) => item.id === match.course.id)
      : undefined;
    rows.push(
      [
        'GOOGLE',
        status,
        place.id,
        place.displayName?.text,
        place.formattedAddress,
        place.location.latitude,
        place.location.longitude,
        place.googleMapsUri,
        course?.id,
        course?.name,
        course?.city,
        match?.distanceKm.toFixed(2),
        '',
        '',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  for (const course of courses) {
    if (matchedCourseIds.has(course.id)) continue;

    const closestGoogleDistance = places.reduce<number | null>(
      (closest, place) => {
        if (!validPlace(place)) return closest;
        const distance = courseDistanceKm(course, {
          lat: place.location.latitude,
          lon: place.location.longitude,
        });
        return closest === null || distance < closest ? distance : closest;
      },
      null,
    );

    statusCounts.DATABASE_ONLY++;
    rows.push(
      [
        'DATABASE',
        'DATABASE_ONLY',
        '',
        '',
        '',
        '',
        '',
        '',
        course.id,
        course.name,
        course.city,
        closestGoogleDistance === null
          ? ''
          : closestGoogleDistance.toFixed(2),
        '',
        '',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf-8');

  console.log(
    `Summary: database=${courses.length} google_unique=${places.length} matched=${statusCounts.MATCHED} review_nearby=${statusCounts.REVIEW_NEARBY} possible_missing=${statusCounts.POSSIBLE_MISSING} database_only=${statusCounts.DATABASE_ONLY}`,
  );
  console.log(
    `Coverage: requests=${centers.length} saturated_cells=${saturatedCells.length} discarded_non_CH=${discardedOutsideSwitzerland}`,
  );
  if (saturatedCells.length > 0) {
    console.warn(
      `WARNING: ${saturatedCells.length} cell(s) returned the 20-result maximum; review coverage before treating the report as complete.`,
    );
  }
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
