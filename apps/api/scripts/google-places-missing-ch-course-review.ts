import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { REVIEWED_MISSING_CH_COURSES } from '../src/courses/reviewed-missing-ch-courses';

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
        languageCode: 'en',
        regionCode: 'CH',
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
  const confirmed = process.argv.includes(
    '--confirm-google-places-requests',
  );

  if (!dryRun || !confirmed) {
    console.error(
      'Usage: npx ts-node scripts/google-places-missing-ch-course-review.ts --dry-run --confirm-google-places-requests',
    );
    process.exit(1);
  }

  console.log(
    `Read-only candidate review: courses=${REVIEWED_MISSING_CH_COURSES.length} requests=${REVIEWED_MISSING_CH_COURSES.length}`,
  );

  const rows = [
    [
      'expectedName',
      'expectedCity',
      'expectedRegion',
      'expectedHoles',
      'expectedWebsite',
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
    index < REVIEWED_MISSING_CH_COURSES.length;
    index++
  ) {
    const course = REVIEWED_MISSING_CH_COURSES[index];
    const query = `${course.name} ${course.city} Switzerland golf course`;
    const places = await textSearch(query);
    const candidates: Array<GooglePlace | undefined> =
      places.length > 0 ? places : [undefined];

    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
      const place = candidates[candidateIndex];
      rows.push(
        [
          course.name,
          course.city,
          course.region,
          course.holes,
          course.website,
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
      `Reviewed ${index + 1}/${REVIEWED_MISSING_CH_COURSES.length}: ${course.name} candidates=${places.length}`,
    );
  }

  const outputPath = path.resolve(
    'course-audits/ch-missing-course-google-candidates.csv',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf-8');

  console.log(`Reviewed courses: ${REVIEWED_MISSING_CH_COURSES.length}`);
  console.log(`Google requests: ${REVIEWED_MISSING_CH_COURSES.length}`);
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
