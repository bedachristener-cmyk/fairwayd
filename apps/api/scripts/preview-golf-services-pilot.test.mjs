import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGolfServicesPilot, validateGolfServicesPilot } from './preview-golf-services-pilot.mjs';

test('review fixture contains a single draft venue and independent offerings', () => {
  const data = loadGolfServicesPilot();
  assert.deepEqual(validateGolfServicesPilot(data), { venues: 1, offerings: 4, providers: 1 });
  assert.equal(data.venues[0].name, 'The Golf Lounge');
  assert.equal(data.venues[0].offerings.find((x) => x.category === 'SIMULATOR').unitCount, 2);
  assert.equal(data.venues[0].providers[0].role, 'GOLF_PRO');
});

test('rejects accidental publication', () => {
  const data = loadGolfServicesPilot();
  data.venues[0].status = 'VERIFIED';
  assert.throws(() => validateGolfServicesPilot(data), /draft-only pilot/);
});

test('rejects duplicate services per physical venue', () => {
  const data = loadGolfServicesPilot();
  data.venues[0].offerings.push({ ...data.venues[0].offerings[0] });
  assert.throws(() => validateGolfServicesPilot(data), /duplicate category/);
});

test('rejects unreviewed Google response content mixed into fixture', () => {
  const data = loadGolfServicesPilot();
  data.venues[0].googlePlaceId = 'unexpected';
  assert.throws(() => validateGolfServicesPilot(data), /Google discovery output/);
});

test('rejects malformed location coordinates', () => {
  const data = loadGolfServicesPilot();
  data.venues[0].lat = 47.5;
  assert.throws(() => validateGolfServicesPilot(data), /incomplete coordinate pair/);
});

test('rejects a second draft for the same venue despite different reference and punctuation', () => {
  const data = loadGolfServicesPilot();
  const duplicate = structuredClone(data.venues[0]);
  duplicate.reference = 'ch-rheinfelden-duplicate-lounge';
  duplicate.name = 'The GOLF-Lounge';
  duplicate.addressLine = 'Quellenstrasse 37';
  duplicate.postalCode = '4310';
  data.venues.push(duplicate);
  assert.throws(() => validateGolfServicesPilot(data), /possible duplicate physical venue/);
});

test('does not merge independent businesses merely because the address matches', () => {
  const data = loadGolfServicesPilot();
  const second = structuredClone(data.venues[0]);
  second.reference = 'ch-rheinfelden-other-company';
  second.name = 'Independent Golf Shop';
  data.venues.push(second);
  assert.deepEqual(validateGolfServicesPilot(data), { venues: 2, offerings: 8, providers: 2 });
});

test('allows separate locations of an operator with the same name', () => {
  const data = loadGolfServicesPilot();
  const second = structuredClone(data.venues[0]);
  second.reference = 'ch-other-the-golf-lounge';
  second.postalCode = '4000';
  second.city = 'Basel';
  second.addressLine = 'Another Street 5';
  data.venues.push(second);
  assert.deepEqual(validateGolfServicesPilot(data), { venues: 2, offerings: 8, providers: 2 });
});
