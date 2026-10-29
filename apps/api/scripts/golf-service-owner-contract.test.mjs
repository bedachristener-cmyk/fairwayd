// Static, read-only contract tests. No Prisma connection, no migrations or DB writes.
// These tests do not replace Prisma validation or an isolated SQL migration rehearsal.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../prisma/migrations/20261021185500_add_golf_service_directory/migration.sql', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/golf-services/golf-services.service.ts', import.meta.url), 'utf8');

test('both owner link tables enforce exactly one of venueId or courseId', () => {
  for (const table of ['GolfServiceOffering', 'GolfServiceVenueProvider']) {
    const constraint = new RegExp(
      'CONSTRAINT "' + table + '_exclusive_owner_check" CHECK \\(' +
      '[\\s\\S]*?"venueId" IS NOT NULL AND "courseId" IS NULL' +
      '[\\s\\S]*?"venueId" IS NULL AND "courseId" IS NOT NULL' +
      '[\\s\\S]*?\\)',
    );
    assert.match(migration, constraint, table + ' needs XOR ownership');
  }
});

test('Course and Venue references exist for both link tables', () => {
  for (const table of ['GolfServiceOffering', 'GolfServiceVenueProvider']) {
    for (const [field, referenced] of [['courseId', 'Course'], ['venueId', 'GolfServiceVenue']]) {
      assert.match(migration,
        new RegExp('ALTER TABLE "' + table + '"[\\s\\S]*?ADD CONSTRAINT "' +
          table + '_' + field + '_fkey"[\\s\\S]*?REFERENCES "' + referenced + '"\\("id"\\)'));
    }
    assert.match(schema, new RegExp('model ' + table + ' \\{[\\s\\S]*?courseId\\s+String\\?'));
    assert.match(schema, new RegExp('model ' + table + ' \\{[\\s\\S]*?venueId\\s+String\\?'));
  }
});

test('each physical owner can have at most one offering per category', () => {
  assert.match(migration, /CREATE UNIQUE INDEX "GolfServiceOffering_venueId_category_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "GolfServiceOffering_courseId_category_key"/);
  assert.match(schema, /@@unique\(\[courseId, category\]\)/);
  assert.match(schema, /@@unique\(\[venueId, category\]\)/);
});

test('provider links cannot be duplicated within the same owner and role', () => {
  assert.match(migration, /CREATE UNIQUE INDEX "GolfServiceVenueProvider_venueId_providerId_role_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "GolfServiceVenueProvider_courseId_providerId_role_key"/);
});

test('public course-service enrichment returns Course ID, not a new physical venue', () => {
  assert.match(service, /courseId: course\.id/);
  assert.match(service, /serviceOfferings: \{ some: verifiedOffering\(category\) \}/);
  assert.match(service, /active: true/);
  assert.match(service, /verifiedAt: \{ not: null \}/);
});
