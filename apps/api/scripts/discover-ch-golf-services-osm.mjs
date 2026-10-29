#!/usr/bin/env node
// Read-only OSM discovery for Golf Near Me Switzerland. No DB access.
// Default: query preview (no HTTP). --fetch: one explicit Overpass request.
// --input=path: offline conversion from saved Overpass JSON.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const fetchMode = args.includes('--fetch');
const inputArg = args.find((arg) => arg.startsWith('--input='));
const inputPath = inputArg?.slice('--input='.length);
if (fetchMode && inputPath) throw new Error('Choose --fetch or --input, not both.');
const regionArg = args.find((arg) => arg.startsWith('--region='));
const region = (regionArg?.slice('--region='.length) ?? 'switzerland').toLowerCase();
if (!['basel', 'switzerland'].includes(region)) {
  throw new Error('Supported regions: basel, switzerland.');
}
const swissFilter = region === 'basel'
  ? '(area.ch)(47.30,7.30,47.80,8.35)'
  : '(area.ch)';
const endpoint = 'https://overpass.osm.ch/api/interpreter';

const query = `[out:json][timeout:120];
area["ISO3166-1"="CH"]["admin_level"="2"]->.ch;
(
  nwr["shop"="golf"](area.ch);
  nwr["shop"="sports"]["sport"="golf"](area.ch);
  nwr["shop"]["name"~"golf",i](area.ch);
  nwr["golf"="driving_range"](area.ch);
  nwr["golf:course"="driving_range"](area.ch);
  nwr["golf"="practice"](area.ch);
  nwr["golf"="academy"](area.ch);
  nwr["leisure"="sports_centre"]["sport"="golf"](area.ch);
  nwr["sport"="golf"]["indoor"="yes"](area.ch);
  nwr["name"~"golf.?simulator|indoor.?golf|trackman|virtual.?golf|golf.?fitting|golf.?academy|golfschule|golf.?shop|golf.?store|golf.?training|golf.?lounge|golf.?studio|club.?fitting|driving.?range",i](area.ch);
);
out center tags;`.replaceAll('(area.ch)', swissFilter);

function csvCell(value) {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function classify(tags) {
  const name = String(tags.name ?? '').toLowerCase();
  const description = String(tags.description ?? '').toLowerCase();
  const brand = String(tags.brand ?? '').toLowerCase();
  const combined = `${name} ${brand} ${description}`;
  const categories = [];

  if (/simulator|indoor.?golf|trackman|virtual.?golf|golf.?lounge|golf.?box|golf.?studio/.test(combined)
      || (tags.sport === 'golf' && tags.indoor === 'yes')) categories.push('SIMULATOR');
  if (tags.shop === 'golf' || (tags.shop === 'sports' && tags.sport === 'golf')
      || (tags.shop && /golf.?shop|golf.?store|golf.?equipment/.test(combined))) categories.push('SHOP');
  if (tags.golf === 'driving_range' || tags['golf:course'] === 'driving_range'
      || /driving.?range/.test(combined)) categories.push('RANGE');
  if (tags.golf === 'academy' || /golf.?academy|golf.?school|golfschule|golf.?unterricht|golf.?coaching|golf.?training/.test(combined)) categories.push('ACADEMY');
  if (/club.?fitting|golf.?fitting|schl[aä]ger.?fitting/.test(combined)) categories.push('FITTING');

  // These tags can denote internal parts of a golf course, not a public service.
  // Keep as a candidate, not a verified RANGE or a published service.
  if (categories.length === 0 && (tags.golf === 'practice' ||
      (tags.leisure === 'sports_centre' && tags.sport === 'golf'))) {
    categories.push('REVIEW');
  }
  return [...new Set(categories)];
}

function normalize(raw) {
  const seen = new Set();
  return (raw.elements ?? []).flatMap((item) => {
    if (!item.tags) return [];
    const id = `${item.type}/${item.id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const t = item.tags;
    const lat = item.lat ?? item.center?.lat;
    const lon = item.lon ?? item.center?.lon;
    const cats = classify(t);
    if (cats.length === 0 || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      source: 'OpenStreetMap',
      osmRef: id,
      name: t.name ?? '',
      categories: cats.join('|'),
      lat, lon,
      city: t['addr:city'] ?? '',
      postcode: t['addr:postcode'] ?? '',
      street: t['addr:street'] ?? '',
      housenumber: t['addr:housenumber'] ?? '',
      website: t.website ?? t['contact:website'] ?? '',
      phone: t.phone ?? t['contact:phone'] ?? '',
      access: t.access ?? '',
      primaryOsmTag: [t.shop && `shop=${t.shop}`, t.golf && `golf=${t.golf}`, t['golf:course'] && `golf:course=${t['golf:course']}`, t.leisure && `leisure=${t.leisure}`, t.sport && `sport=${t.sport}`].filter(Boolean).join('|'),
      osmUrl: `https://www.openstreetmap.org/${id}`,
      reviewDecision: 'PENDING',
      reviewNotes: (!t.name ? 'Name missing; ' : '') +
        (cats.includes('REVIEW') ? 'Service type uncertain; ' : '') +
        (t.golf === 'driving_range' ? 'Check public access; ' : '') +
        (!t.website && !t['contact:website'] ? 'No website in OSM' : ''),

    }];
  }).sort((a, b) => a.name.localeCompare(b.name) || a.osmRef.localeCompare(b.osmRef));
}

async function main() {
  if (!fetchMode && !inputPath) {
    console.log('Golf Near Me CH: preview only. No network request, no DB changes.');
    console.log('To run a regional query: node scripts/discover-ch-golf-services-osm.mjs --fetch --region=basel');
    console.log('Full CH (later): node scripts/discover-ch-golf-services-osm.mjs --fetch --region=switzerland');
    console.log('To convert saved JSON: node scripts/discover-ch-golf-services-osm.mjs --input=C:\\path\\overpass.json');
    console.log(query);
    return;
  }
  let data;
  if (inputPath) {
    data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    console.log(`Requesting one ${region} OSM Overpass query (Swiss public instance; may time out)...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(150000),
    });
    if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}; try again later or use --input`);
    data = await response.json();
  }
  if (!Array.isArray(data.elements)) throw new Error('Expected Overpass JSON with elements array');
  const rows = normalize(data);
  const headers = ['source','osmRef','name','categories','lat','lon','city','postcode','street','housenumber','website','phone','access','primaryOsmTag','osmUrl','reviewDecision','reviewNotes'];
  const output = path.resolve(`service-audits/ch-golf-services-osm-${region}-review.csv`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, [headers.join(','), ...rows.map(row => headers.map(k => csvCell(row[k])).join(','))].join('\n') + '\n', 'utf8');
  console.log(`Candidates: ${rows.length}; output: ${output}`);
  console.log('Read-only discovery: no database changes, no published records.');
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
