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

type ExistingCourse = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string;
  lat: number;
  lon: number;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  types?: string[];
};

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

function locationPart(place: GooglePlace, type: string) {
  return (
    place.addressComponents?.find((component) =>
      component.types?.includes(type),
    )?.longText ?? ''
  );
}

function cityFromPlace(place: GooglePlace) {
  return (
    locationPart(place, 'locality') ||
    locationPart(place, 'administrative_area_level_2')
  );
}

function regionFromPlace(place: GooglePlace) {
  return locationPart(place, 'administrative_area_level_1');
}

function countryFromPlace(place: GooglePlace) {
  return locationPart(place, 'country');
}

function placeLooksGolf(place: GooglePlace) {
  const displayName = norm(place.displayName?.text).toLowerCase();
  const text = [
    place.displayName?.text,
    place.formattedAddress,
    ...(place.types ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const nonCourseTerms = [
    'driving range',
    'simulator',
    'indoor golf',
    'golf lounge',
    'golf academy',
    'golf training',
    'golf shop',
    'golf store',
    'golf tour',
    'golf tours',
    'golf booking',
    'golf bookings',
    'mini golf',
    'condo',
  ];
  const courseTerms = [
    'golf course',
    'golf club',
    'country club',
    'golf resort',
    'golf park',
    'golf links',
  ];

  if (!text.includes('golf') && !text.includes('country club')) return false;

  if (nonCourseTerms.some((term) => text.includes(term))) {
    return courseTerms.some((term) => displayName.includes(term));
  }

  return true;
}

function findBestExistingMatch(
  place: GooglePlace,
  existingCourses: ExistingCourse[],
) {
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  const name = norm(place.displayName?.text);
  const normalizedPlaceName = normalizeName(name);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { course: null, distance: null, nameRelated: false };
  }

  let best:
    | {
        course: ExistingCourse;
        distance: number;
        nameRelated: boolean;
      }
    | null = null;

  for (const course of existingCourses) {
    const distance = distanceKm(
      { lat: lat as number, lon: lon as number },
      { lat: course.lat, lon: course.lon },
    );
    const normalizedCourseName = normalizeName(course.name);
    const nameRelated =
      !!normalizedCourseName &&
      !!normalizedPlaceName &&
      (normalizedCourseName === normalizedPlaceName ||
        normalizedCourseName.includes(normalizedPlaceName) ||
        normalizedPlaceName.includes(normalizedCourseName));

    if (
      !best ||
      (nameRelated && !best.nameRelated) ||
      (nameRelated === best.nameRelated && distance < best.distance)
    ) {
      best = { course, distance, nameRelated };
    }
  }

  return best ?? { course: null, distance: null, nameRelated: false };
}

function reviewPlace(place: GooglePlace, existingCourses: ExistingCourse[]) {
  const best = findBestExistingMatch(place, existingCourses);
  const name = norm(place.displayName?.text);

  if (!best.course || best.distance === null) {
    return {
      include: true,
      matchConfidence: 'no_existing_match',
      possibleExistingMatch: '',
      distanceToExistingKm: '',
      suggestedAction: 'missing_candidate',
      notes: 'No comparable existing course found.',
    };
  }

  const possibleExistingMatch = best.course.name;
  const distanceText = best.distance.toFixed(2);

  if (best.nameRelated && best.distance <= 5) {
    return {
      include: false,
      matchConfidence: 'existing_match',
      possibleExistingMatch,
      distanceToExistingKm: distanceText,
      suggestedAction: 'skip_existing',
      notes: 'Name-related existing course found within 5km.',
    };
  }

  if (best.distance <= 0.25) {
    return {
      include: true,
      matchConfidence: 'nearby_different_name',
      possibleExistingMatch,
      distanceToExistingKm: distanceText,
      suggestedAction: 'possible_duplicate',
      notes: 'Very close to an existing course but name differs.',
    };
  }

  if (best.nameRelated) {
    return {
      include: true,
      matchConfidence: 'name_match_far_coordinate',
      possibleExistingMatch,
      distanceToExistingKm: distanceText,
      suggestedAction: 'possible_duplicate',
      notes: 'Name looks related, but coordinates are far apart.',
    };
  }

  if (best.distance <= 1) {
    return {
      include: true,
      matchConfidence: 'near_existing_course',
      possibleExistingMatch,
      distanceToExistingKm: distanceText,
      suggestedAction: 'possible_duplicate',
      notes: 'Within 1km of existing course with a different name.',
    };
  }

  return {
    include: true,
    matchConfidence: best.distance <= 5 ? 'review_nearby' : 'likely_missing',
    possibleExistingMatch,
    distanceToExistingKm: distanceText,
    suggestedAction: 'missing_candidate',
    notes:
      best.distance <= 5
        ? 'Nearest existing course is within 5km; review before import.'
        : 'Nearest existing course is farther than 5km.',
  };
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
          'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.types,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.addressComponents',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        regionCode: country,
        maxResultCount: 20,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Google Places request failed for "${query}": ${response.status} ${response.statusText} ${body}`,
    );
  }

  const json = (await response.json()) as { places?: GooglePlace[] };
  return Array.isArray(json.places) ? json.places : [];
}

function discoveryQueries(countryName: string) {
  const cities = [
    'Thailand',
    'Bangkok',
    'Pattaya',
    'Hua Hin',
    'Phuket',
    'Chiang Mai',
    'Chiang Rai',
    'Kanchanaburi',
    'Chonburi',
    'Rayong',
    'Ayutthaya',
    'Nakhon Pathom',
    'Samut Prakan',
    'Pathum Thani',
    'Khon Kaen',
    'Korat',
    'Khao Yai',
    'Krabi',
    'Koh Samui',
    'Surat Thani',
    'Ratchaburi',
    'Phetchaburi',
    'Cha-Am',
    'Ubon Ratchathani',
  ];

  return [
    ...cities.map((city) => `golf course ${city} ${countryName}`),
    ...cities.map((city) => `golf club ${city} ${countryName}`),
    'Plu Th Luang Golf Course Thailand',
    'Plutaluang Navy Golf Course Thailand',
    'Plu Ta Luang Royal Thai Navy Golf Course Thailand',
  ];
}

async function main() {
  const country = norm(process.argv[2]).toUpperCase();
  const countryName = process.argv[3] || 'Thailand';
  const outputArg = process.argv[4] || 'data/th-missing-course-candidates.csv';

  if (!country) {
    console.error(
      'Usage: npx ts-node scripts/discover-missing-google-places.ts <countryCode> [countryName] [outputCsv]',
    );
    process.exit(1);
  }

  const existingCourses = await prisma.course.findMany({
    where: { country, active: true },
    select: {
      id: true,
      name: true,
      city: true,
      region: true,
      country: true,
      lat: true,
      lon: true,
    },
    orderBy: [{ name: 'asc' }],
  });

  const placesById = new Map<string, GooglePlace>();
  const queries = discoveryQueries(countryName);
  const errors: string[] = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      const places = await textSearch(query, country);
      for (const place of places) {
        if (!place.id || !placeLooksGolf(place)) continue;
        placesById.set(place.id, place);
      }
      console.log(
        `Query ${i + 1}/${queries.length}: ${query} -> ${places.length}`,
      );
    } catch (error: any) {
      errors.push(error?.message ?? String(error));
      console.warn(error?.message ?? error);
    }
  }

  const rows = [
    [
      'name',
      'googlePlaceId',
      'lat',
      'lon',
      'city',
      'region',
      'country',
      'website',
      'phone',
      'googleMapsUrl',
      'matchConfidence',
      'possibleExistingMatch',
      'distanceToExistingKm',
      'suggestedAction',
      'notes',
    ].join(','),
  ];

  let missingCandidates = 0;
  let possibleDuplicates = 0;

  for (const place of [...placesById.values()].sort((a, b) =>
    norm(a.displayName?.text).localeCompare(norm(b.displayName?.text)),
  )) {
    const lat = place.location?.latitude;
    const lon = place.location?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const review = reviewPlace(place, existingCourses);
    if (!review.include) continue;

    if (review.suggestedAction === 'missing_candidate') missingCandidates++;
    if (review.suggestedAction === 'possible_duplicate') possibleDuplicates++;

    rows.push(
      [
        place.displayName?.text,
        place.id,
        lat,
        lon,
        cityFromPlace(place),
        regionFromPlace(place),
        countryFromPlace(place) || country,
        place.websiteUri,
        place.internationalPhoneNumber || place.nationalPhoneNumber,
        place.googleMapsUri,
        review.matchConfidence,
        review.possibleExistingMatch,
        review.distanceToExistingKm,
        review.suggestedAction,
        review.notes,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  const outputPath = path.resolve(outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf-8');

  console.log(`Existing ${country} courses: ${existingCourses.length}`);
  console.log(`Discovery queries: ${queries.length}`);
  console.log(`Discovered Google Places golf places: ${placesById.size}`);
  console.log(`Missing candidates: ${missingCandidates}`);
  console.log(`Possible duplicates: ${possibleDuplicates}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Output: ${outputPath}`);

  if (errors.length > 0) {
    console.log('Errors:');
    for (const error of errors) console.log(`- ${error}`);
  }
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
