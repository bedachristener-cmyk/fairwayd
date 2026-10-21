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
