#!/usr/bin/env node
// Preview and validate manually sourced Golf Near Me pilot data.
// No database connection, no network calls, no write mode.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureFile = new URL('./fixtures/ch-basel-golf-services-pilot.json', import.meta.url);
const categories = new Set(['SIMULATOR', 'SHOP', 'RANGE', 'ACADEMY', 'FITTING']);
const sourceKinds = new Set(['OFFICIAL_WEBSITE', 'USER_REPORT', 'OPENSTREETMAP', 'INDEPENDENT_RESEARCH']);
const providerRoles = new Set(['GOLF_PRO', 'FITTER', 'OPERATOR']);
const providerKinds = new Set(['UNKNOWN', 'PERSON', 'ORGANIZATION']);

function requireCondition(ok, message) {
  if (!ok) throw new Error('Pilot validation failed: ' + message);
}

// Conservative, read-only duplicate check inside the review fixture.
// Name + complete postal address must match; location proximity by itself is
// NOT sufficient (e.g. separate golf businesses sharing a building).
function normalizedIdentityPart(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function venueIdentityKey(venue) {
  const name = normalizedIdentityPart(venue.name);
  const address = normalizedIdentityPart(venue.addressLine);
  const postalCode = normalizedIdentityPart(venue.postalCode);
  const country = normalizedIdentityPart(venue.country);
  if (!name || !address || !postalCode || !country) return null;
  return [country, postalCode, address, name].join('|');
}

function validSource(entry, context) {
  requireCondition(sourceKinds.has(entry.sourceKind), context + ': invalid source kind');
  requireCondition(entry.sourceUrl === null || (typeof entry.sourceUrl === 'string' && /^https:\/\//.test(entry.sourceUrl)), context + ': invalid source URL');
  requireCondition(
    !entry.sourceUrl || !/maps\.google\.com|google\.com\/maps/i.test(entry.sourceUrl),
    context + ': persist original/operator sources, not Google Places result links',
  );
}

export function validateGolfServicesPilot(data) {
  requireCondition(data?.schemaVersion === 1, 'schemaVersion must be 1');
  requireCondition(Array.isArray(data.venues) && data.venues.length > 0, 'expected nonempty venues');
  const references = new Set();
  const physicalIdentities = new Map();
  let offerings = 0;
  let providers = 0;

  for (const venue of data.venues) {
    requireCondition(typeof venue.reference === 'string' && venue.reference.length > 0, 'venue reference required');
    requireCondition(!references.has(venue.reference), 'duplicate venue reference: ' + venue.reference);
    references.add(venue.reference);
    requireCondition(venue.status === 'DRAFT' && venue.verifiedAt === null, venue.reference + ': draft-only pilot');
    requireCondition(typeof venue.name === 'string' && venue.name.trim(), venue.reference + ': name required');
    const identityKey = venueIdentityKey(venue);
    if (identityKey) {
      const previousRef = physicalIdentities.get(identityKey);
      requireCondition(
        !previousRef,
        'possible duplicate physical venue: ' + venue.reference + ' matches ' + previousRef,
      );
      physicalIdentities.set(identityKey, venue.reference);
    }
    requireCondition(/^[A-Z]{2}$/.test(venue.country ?? ''), venue.reference + ': two-letter country required');
    requireCondition((venue.lat === null) === (venue.lon === null), venue.reference + ': incomplete coordinate pair');
    if (venue.lat !== null) {
      requireCondition(Number.isFinite(venue.lat) && Math.abs(venue.lat) <= 90, venue.reference + ': invalid latitude');
      requireCondition(Number.isFinite(venue.lon) && Math.abs(venue.lon) <= 180, venue.reference + ': invalid longitude');
    }
    requireCondition(!Object.hasOwn(venue, 'googlePlaceId'), venue.reference + ': do not mix Google discovery output into reviewed source fixture');
    validSource(venue, venue.reference);
    requireCondition(Array.isArray(venue.offerings) && venue.offerings.length > 0, venue.reference + ': offerings required');
    requireCondition(Array.isArray(venue.providers), venue.reference + ': providers array required');

    const seenCategories = new Set();
    for (const offering of venue.offerings) {
      requireCondition(categories.has(offering.category), venue.reference + ': unknown category ' + offering.category);
      requireCondition(!seenCategories.has(offering.category), venue.reference + ': duplicate category ' + offering.category);
      seenCategories.add(offering.category);
      requireCondition(offering.status === 'DRAFT' && offering.verifiedAt === null, venue.reference + ': no published offerings');
      requireCondition(offering.unitCount === null || (Number.isInteger(offering.unitCount) && offering.unitCount > 0), venue.reference + ': invalid unit count');
      validSource(offering, venue.reference + '/' + offering.category);
      offerings++;
    }

    const seenProviders = new Set();
    for (const provider of venue.providers) {
      requireCondition(typeof provider.name === 'string' && provider.name.trim(), venue.reference + ': provider name required');
      requireCondition(providerKinds.has(provider.kind), venue.reference + ': unknown provider kind');
      requireCondition(providerRoles.has(provider.role), venue.reference + ': unknown provider role');
      const key = provider.name.trim().toLowerCase() + '|' + provider.role;
      requireCondition(!seenProviders.has(key), venue.reference + ': duplicate provider and role');
      seenProviders.add(key);
      requireCondition(provider.status === 'DRAFT' && provider.verifiedAt === null, venue.reference + ': no published provider links');
      validSource(provider, venue.reference + '/' + provider.name);
      providers++;
    }
  }
  return { venues: data.venues.length, offerings, providers };
}

export function loadGolfServicesPilot() {
  return JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
}

function main() {
  requireCondition(process.argv.length === 2, 'no flags supported (particularly no --apply)');
  const data = loadGolfServicesPilot();
  const counts = validateGolfServicesPilot(data);
  console.log('Golf Near Me CH — fixture review preview ONLY');
  for (const venue of data.venues) {
    console.log('\nVenue: ' + venue.name + ' (' + venue.city + ', ' + venue.country + ')');
    console.log('Status: ' + venue.status + ' | Coordinates: ' + (venue.lat === null ? 'not yet reviewed' : 'present'));
    console.log('Offerings: ' + venue.offerings.map((item) =>
      item.category + (item.unitCount ? ' x' + item.unitCount : '') + ' [' + item.sourceKind + ']',
    ).join(', '));
    console.log('Providers: ' + venue.providers.map((p) => p.name + ' (' + p.role + ')').join(', '));
  }
  console.log('\nValidated: ' + counts.venues + ' venue(s), ' + counts.offerings + ' offerings, ' + counts.providers + ' provider link(s).');
  console.log('Network calls: 0 | Database connections: 0 | Database writes: 0 | Published records: 0');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
