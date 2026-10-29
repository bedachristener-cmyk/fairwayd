import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  REVIEWED_TH_COURSE_INVENTORY_TARGETS,
  validateReviewedThCourseInventoryTargets,
} from '../src/courses/reviewed-th-course-inventory';

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
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function textSearch(query: string): Promise<GooglePlace[]> {
  for (let attempt = 1; attempt <= 6; attempt++) {
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
          regionCode: 'TH',
          maxResultCount: 3,
        }),
      },
    );

    if (response.ok) {
      const body = (await response.json()) as { places?: GooglePlace[] };
      return Array.isArray(body.places) ? body.places.slice(0, 3) : [];
    }

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

    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === 6) {
      throw new Error(
        `Google Places request failed: ${response.status} ${detail}`,
      );
    }

    const waitMilliseconds = Math.min(2000 * 2 ** (attempt - 1), 30000);
    console.warn(
      `Google Places temporary failure: ${response.status} ${detail}; retry ${attempt}/6 in ${waitMilliseconds}ms`,
    );
    await sleep(waitMilliseconds);
  }

  return [];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--confirm-google-places-requests');
  if (!dryRun || !confirmed) {
    console.error(
      'Usage: npx ts-node scripts/google-places-th-course-inventory-review.ts --dry-run --confirm-google-places-requests',
    );
    process.exit(1);
  }

  const definitionErrors = validateReviewedThCourseInventoryTargets();
  if (definitionErrors.length > 0) {
    throw new Error(
      `Invalid Thailand inventory targets: ${definitionErrors.join('; ')}`,
    );
  }

  console.log(
    `Read-only Thailand inventory review: courses=${REVIEWED_TH_COURSE_INVENTORY_TARGETS.length} requests=${REVIEWED_TH_COURSE_INVENTORY_TARGETS.length}`,
  );

  const rows = [
    [
      'expectedName',
      'expectedHoles',
      'searchQuery',
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

  for (let index = 0; index < REVIEWED_TH_COURSE_INVENTORY_TARGETS.length; index++) {
    const target = REVIEWED_TH_COURSE_INVENTORY_TARGETS[index];
    const places = await textSearch(target.query);
    const candidates: Array<GooglePlace | undefined> =
      places.length > 0 ? places : [undefined];

    candidates.forEach((place, candidateIndex) => {
      rows.push(
        [
          target.name,
          target.expectedHoles,
          target.query,
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
    });

    console.log(
      `Reviewed ${index + 1}/${REVIEWED_TH_COURSE_INVENTORY_TARGETS.length}: ${target.name} candidates=${places.length}`,
    );
    await sleep(300);
  }

  const outputPath = path.resolve(
    'course-audits/th-course-inventory-google-candidates.csv',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf8');

  console.log(`Reviewed courses: ${REVIEWED_TH_COURSE_INVENTORY_TARGETS.length}`);
  console.log(`Google requests: ${REVIEWED_TH_COURSE_INVENTORY_TARGETS.length}`);
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
