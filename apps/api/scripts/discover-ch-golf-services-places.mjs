#!/usr/bin/env node
// Golf Near Me CH: small read-only Google Places Text Search pilot.
// Preview by default. Explicit --fetch AND --confirm-google-places-requests.
// Hard cap: 5 API calls per UTC day per local checkout (usage metadata only).
// This utility does NOT store Google Places business content or write to a DB.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const REQUESTS = Object.freeze([
  { category: 'SIMULATOR', query: 'Indoor Golf Simulator Basel Switzerland' },
  { category: 'SIMULATOR', query: 'Golf Simulator Rheinfelden Switzerland' },
  { category: 'SHOP', query: 'Golf shop Pratteln Basel Switzerland' },
  { category: 'FITTING', query: 'Golf club fitting Basel Switzerland' },
  { category: 'RANGE', query: 'Driving range golf Basel Switzerland' },
]);
const DAILY_MAX = 5;
const usageFile = path.resolve('service-audits/ch-golf-services-places-usage.csv');
const args = process.argv.slice(2);
const execute = args.includes('--fetch');
const confirmed = args.includes('--confirm-google-places-requests');
const countArgument = args.find((arg) => arg.startsWith('--max-requests='));
const count = countArgument ? Number(countArgument.split('=')[1]) : 3;

if (!Number.isInteger(count) || count < 1 || count > DAILY_MAX) {
  console.error('Specify --max-requests=1..5; default is 3.');
  process.exit(1);
}

const selected = REQUESTS.slice(0, count);
function usedToday() {
  if (!fs.existsSync(usageFile)) return 0;
  const date = new Date().toISOString().slice(0, 10);
  return fs.readFileSync(usageFile, 'utf8').split(/\r?\n/).filter((line) => line.startsWith(date + ',')).length;
}
function recordAttempt(index) {
  fs.mkdirSync(path.dirname(usageFile), { recursive: true });
  const timestamp = new Date().toISOString();
  fs.appendFileSync(usageFile, timestamp + ',' + index + '\n', 'utf8');
}

async function run() {
  console.log('Golf Near Me / Basel: Google Places Text Search Pro (read-only)');
  console.log('Requests selected: ' + selected.length + '/' + DAILY_MAX);
  console.log('Configured daily maximum: ' + DAILY_MAX + ' per local checkout (UTC day).');
  console.log('Billing: Text Search Pro; check Google Cloud billing and SKU free caps.');
  console.log('No DB writes. Google response data is printed, not saved.');
  selected.forEach((item, i) => console.log((i + 1) + '. ' + item.category + ': ' + item.query));

  if (!execute) {
    console.log('Preview only: zero API calls.');
    console.log('To run: node scripts/discover-ch-golf-services-places.mjs --fetch --confirm-google-places-requests');
    return;
  }
  if (!confirmed) throw new Error('No requests made: also add --confirm-google-places-requests.');
  const key = process.env.GOOGLE_PLACES_REVIEW_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Set GOOGLE_PLACES_REVIEW_API_KEY or GOOGLE_MAPS_API_KEY in apps/api/.env.');
  const alreadyUsed = usedToday();
  if (alreadyUsed + selected.length > DAILY_MAX) {
    throw new Error('Daily limit reached or would be exceeded: used=' + alreadyUsed + ', requested=' + selected.length + ', maximum=' + DAILY_MAX + '.');
  }

  for (const [index, item] of selected.entries()) {
    // Record *before* the request to avoid accidental repeat billing after crashes/errors.
    recordAttempt(index + 1);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
        },
        body: JSON.stringify({
          textQuery: item.query,
          regionCode: 'CH',
          languageCode: 'de',
          maxResultCount: 8,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const body = (await response.text()).slice(0, 450);
      throw new Error('Places request ' + (index + 1) + ' failed: HTTP ' + response.status + ': ' + body);
    }
    const data = await response.json();
    const places = Array.isArray(data.places) ? data.places : [];
    console.log('\n' + item.category + ' — ' + places.length + ' result(s):');
    for (const place of places) {
      console.log(' - ' + (place.displayName?.text ?? '(unnamed)') +
        ' | ' + (place.formattedAddress ?? '') +
        ' | ' + (place.googleMapsUri ?? '') +
        ' | placeId=' + (place.id ?? ''));
    }
  }
  console.log('\nCompleted. Do not copy Google response fields into a permanent Fairwayd directory.');
  console.log('Verify any candidate independently from its operator website before adding independently sourced facts.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
