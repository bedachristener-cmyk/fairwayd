#!/usr/bin/env node
/**
 * Golf Near Me CH — read-only Google Places category smoke test.
 *
 * Preview is the default (no network calls).
 * --fetch --confirm-google-places-requests: at most 5 Text Search (New)
 * API requests. Calls may be billable. Results are only printed; no
 * cache, CSV, database import, or file writes. Place IDs may be retained
 * separately, subject to Google Maps Platform terms.
 *
 * Run from apps/api so that dotenv can load apps/api/.env.
 */
import 'dotenv/config';

const args = process.argv.slice(2);
const shouldFetch = args.includes('--fetch');
const confirmed = args.includes('--confirm-google-places-requests');
const unexpected = args.filter(arg => ![
  '--fetch',
  '--confirm-google-places-requests',
].includes(arg));
if (unexpected.length) {
  throw new Error('Unsupported arguments: ' + unexpected.join(', '));
}
if (shouldFetch && !confirmed) {
  throw new Error('Explicit confirmation required: add --confirm-google-places-requests');
}
if (!shouldFetch && confirmed) {
  throw new Error('Use --confirm-google-places-requests together with --fetch');
}

const searches = [
  ['SIMULATOR', 'Indoor Golf Simulator TrackMan Basel Schweiz'],
  ['SIMULATOR', 'Golfsimulator Basel Landschaft Schweiz'],
  ['SHOP', 'Golfshop Golfgeschäft Basel Schweiz'],
  ['ACADEMY', 'Golfschule Golf Academy Basel Schweiz'],
  ['FITTING', 'Golf Fitting Clubfitting Basel Schweiz'],
];

// Basel is a fixed pilot search center, not the user's position.
// locationBias guides ranking; candidates may be outside the region.
const center = { latitude: 47.5596, longitude: 7.5886 };
const radius = 30000;

async function main() {
  console.log('Golf Near Me: Google Places CH / Basel category smoke test');
  console.log('Search center: Basel; 30 km location bias (not a hard boundary).');
  for (const [category, query] of searches) {
    console.log(' - ' + category + ': ' + query);
  }
  console.log('Maximum requests per execution: ' + searches.length);
  console.log('No caching, files, database writes, or live app changes.');
  if (!shouldFetch) {
    console.log('PREVIEW ONLY. To opt in to potentially billable API calls, run:');
    console.log('node scripts/probe-ch-golf-services-google.mjs --fetch --confirm-google-places-requests');
    return;
  }

  const key = process.env.GOOGLE_PLACES_REVIEW_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_REVIEW_API_KEY or GOOGLE_MAPS_API_KEY missing from apps/api/.env');
  const uniques = new Set();
  for (const [category, textQuery] of searches) {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'de',
        regionCode: 'CH',
        maxResultCount: 10,
        locationBias: { circle: { center, radius } },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      // Do not print authentication headers or API keys.
      throw new Error('Google Places returned HTTP ' + response.status + ' for ' + category + '. Stop; no automatic retry.');
    }
    const body = await response.json();
    const items = Array.isArray(body.places) ? body.places : [];
    console.log('\n' + category + ': ' + items.length + ' candidate(s) for "' + textQuery + '"');
    for (const item of items) {
      const duplicate = uniques.has(item.id);
      if (item.id) uniques.add(item.id);
      console.log('  ' + (duplicate ? '[duplicate] ' : '') +
        (item.displayName?.text || '(no name)') + ' | ' +
        (item.formattedAddress || '(no address)') +
        (item.id ? ' | ID ' + item.id : ''));
    }
  }
  console.log('\nUnique Place IDs seen: ' + uniques.size + '. These are candidates, not verified services.');
  console.log('Review candidates using independent sources. Do not copy this output into a permanent directory.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
