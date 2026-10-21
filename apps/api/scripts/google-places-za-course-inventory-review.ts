import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  isReviewedZaCourseInventoryCandidate,
  ZaDiscoveryRow,
} from '../src/courses/reviewed-za-course-inventory';

const googleApiKey =
  process.env.GOOGLE_PLACES_REVIEW_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY;

if (!googleApiKey) {
  console.error(
    'GOOGLE_PLACES_REVIEW_API_KEY or GOOGLE_MAPS_API_KEY is missing. Check apps/api/.env',
  );
  process.exit(1);
}

type DiscoveryRow = ZaDiscoveryRow & {
  city: string;
  region: string;
  googleLat: string;
  googleLon: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  movedPlaceId?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(content: string): Record<string, string>[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n') {
      record.push(field.replace(/\r$/, ''));
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ''));
    records.push(record);
  }

  const [headers, ...rows] = records;
  if (!headers) return [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );
}

async function placeDetails(placeId: string): Promise<GooglePlace> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en&regionCode=ZA`,
      {
        headers: {
          'X-Goog-Api-Key': googleApiKey as string,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'googleMapsUri',
            'businessStatus',
            'primaryType',
            'types',
            'movedPlaceId',
            'websiteUri',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'rating',
            'userRatingCount',
            'regularOpeningHours.weekdayDescriptions',
            'editorialSummary',
          ].join(','),
        },
      },
    );

    if (response.ok) return (await response.json()) as GooglePlace;

    let detail = response.statusText || 'request rejected';
    try {
      const body = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail =
        [body.error?.status, body.error?.message].filter(Boolean).join(': ') ||
        detail;
    } catch {
      // Keep HTTP status text when Google did not return JSON.
    }

    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === 6) {
      throw new Error(
        `Google Places request failed for ${placeId}: ${response.status} ${detail}`,
      );
    }

    const waitMilliseconds = Math.min(2000 * 2 ** (attempt - 1), 30000);
    console.warn(
      `Google Places temporary failure: ${response.status} ${detail}; retry ${attempt + 1}/6 in ${waitMilliseconds}ms`,
    );
    await sleep(waitMilliseconds);
  }

  throw new Error(`Google Places request failed for ${placeId}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--confirm-google-places-requests');
  if (!dryRun || !confirmed) {
    console.error(
      'Usage: npx ts-node scripts/google-places-za-course-inventory-review.ts --dry-run --confirm-google-places-requests',
    );
    process.exit(1);
  }

  const discoveryPath = path.resolve(
    'course-audits/za-google-places-discovery.csv',
  );
  if (!fs.existsSync(discoveryPath)) {
    throw new Error(
      `Discovery CSV not found: ${discoveryPath}. Run google-places-course-discovery.ts ZA first.`,
    );
  }

  const discoveryRows = parseCsv(
    fs.readFileSync(discoveryPath, 'utf8').replace(/^\uFEFF/, ''),
  ) as DiscoveryRow[];
  const targets = discoveryRows.filter(isReviewedZaCourseInventoryCandidate);
  const duplicateIds = targets.filter(
    (target, index) =>
      targets.findIndex((candidate) => candidate.placeId === target.placeId) !==
      index,
  );
  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate reviewed Place IDs: ${duplicateIds.map((item) => item.placeId).join(', ')}`,
    );
  }
  if (targets.length !== 251) {
    throw new Error(
      `Expected 251 reviewed South Africa candidates, found ${targets.length}. Refusing to run against a different discovery export.`,
    );
  }

  const checkpointPath = path.resolve(
    'course-audits/za-course-inventory-google-details.checkpoint.json',
  );
  const checkpoint: Record<string, GooglePlace> = fs.existsSync(checkpointPath)
    ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8'))
    : {};

  console.log(
    `Read-only South Africa inventory review: courses=${targets.length} requests_remaining=${targets.filter((item) => !checkpoint[item.placeId]).length} resumed=${Object.keys(checkpoint).length}`,
  );

  for (let index = 0; index < targets.length; index++) {
    const target = targets[index];
    if (!checkpoint[target.placeId]) {
      checkpoint[target.placeId] = await placeDetails(target.placeId);
      fs.writeFileSync(
        checkpointPath,
        `${JSON.stringify(checkpoint, null, 2)}\n`,
        'utf8',
      );
      await sleep(150);
    }

    console.log(
      `Reviewed ${index + 1}/${targets.length}: ${target.googleName}${checkpoint[target.placeId] ? '' : ' missing'}`,
    );
  }

  const rows = [[
    'expectedName',
    'discoveryStatus',
    'discoveryBusinessStatus',
    'discoveryCity',
    'discoveryRegion',
    'placeId',
    'displayName',
    'businessStatus',
    'primaryType',
    'types',
    'formattedAddress',
    'googleLat',
    'googleLon',
    'googleMapsUri',
    'websiteUri',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'rating',
    'userRatingCount',
    'openingHours',
    'editorialSummary',
    'movedPlaceId',
    'reviewDecision',
    'reviewNotes',
  ].join(',')];

  for (const target of targets) {
    const place = checkpoint[target.placeId];
    rows.push([
      target.googleName,
      target.status,
      target.googleBusinessStatus,
      target.city,
      target.region,
      target.placeId,
      place?.displayName?.text,
      place?.businessStatus,
      place?.primaryType,
      (place?.types ?? []).join('|'),
      place?.formattedAddress,
      place?.location?.latitude,
      place?.location?.longitude,
      place?.googleMapsUri,
      place?.websiteUri,
      place?.nationalPhoneNumber,
      place?.internationalPhoneNumber,
      place?.rating,
      place?.userRatingCount,
      (place?.regularOpeningHours?.weekdayDescriptions ?? []).join(' | '),
      place?.editorialSummary?.text,
      place?.movedPlaceId,
      '',
      '',
    ].map(csvCell).join(','));
  }

  const outputPath = path.resolve(
    'course-audits/za-course-inventory-google-details.csv',
  );
  fs.writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf8');

  console.log(`Reviewed courses: ${targets.length}`);
  console.log(`Google requests completed: ${targets.length}`);
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
