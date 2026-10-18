import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { REVIEWED_AT_DIRECTORY_MISSING_COURSES } from '../src/courses/reviewed-at-directory-missing-courses';

const googleApiKey =
  process.env.GOOGLE_PLACES_REVIEW_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY;

if (!googleApiKey) {
  console.error(
    'GOOGLE_PLACES_REVIEW_API_KEY or GOOGLE_MAPS_API_KEY is missing. Check apps/api/.env',
  );
  process.exit(1);
}

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

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function textSearch(query: string): Promise<GooglePlace[]> {
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
        languageCode: 'de',
        regionCode: 'AT',
        maxResultCount: 3,
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
  return Array.isArray(body.places) ? body.places.slice(0, 3) : [];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--confirm-google-places-requests');

  if (!dryRun || !confirmed) {
    console.error(
      'Usage: npx ts-node scripts/google-places-at-directory-missing-course-review.ts --dry-run --confirm-google-places-requests',
    );
    process.exit(1);
  }

  const requestCount = REVIEWED_AT_DIRECTORY_MISSING_COURSES.length;
  console.log(
    `Read-only Austrian directory candidate review: courses=${requestCount} requests=${requestCount}`,
  );

  const rows = [
    [
      'country',
      'name',
      'city',
      'region',
      'postalCode',
      'holes',
      'website',
      'evidence',
      'candidateRank',
      'placeId',
      'displayName',
      'formattedAddress',
      'googleLat',
      'googleLon',
      'googleMapsUri',
      'types',
      'reviewDecision',
      'reviewNotes',
    ].join(','),
  ];

  for (
    let index = 0;
    index < REVIEWED_AT_DIRECTORY_MISSING_COURSES.length;
    index++
  ) {
    const course = REVIEWED_AT_DIRECTORY_MISSING_COURSES[index];
    const places = await textSearch(course.searchQuery);
    const candidates: Array<GooglePlace | undefined> =
      places.length > 0 ? places : [undefined];

    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
      const place = candidates[candidateIndex];
      rows.push(
        [
          'AT',
          course.name,
          course.city,
          course.region,
          course.postalCode,
          course.holes,
          course.website,
          course.evidence,
          place ? candidateIndex + 1 : '',
          place?.id,
          place?.displayName?.text,
          place?.formattedAddress,
          place?.location?.latitude,
          place?.location?.longitude,
          place?.googleMapsUri,
          (place?.types ?? []).join('|'),
          '',
          '',
        ]
          .map(csvCell)
          .join(','),
      );
    }

    console.log(
      `Reviewed ${index + 1}/${requestCount}: ${course.name} candidates=${places.length}`,
    );
  }

  const outputPath = path.resolve(
    'course-audits/at-directory-missing-course-google-candidates.csv',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf-8');

  console.log(`Reviewed courses: ${requestCount}`);
  console.log(`Google requests: ${requestCount}`);
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
