#!/usr/bin/env node
// HTTP integration smoke-test using ONLY a disposable, explicitly pinned Neon child.
// No migrations, writes, Stage/Production services, .env changes, or Google requests.
// Starts a minimal Nest app bound to 127.0.0.1 on an OS-assigned port.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXPECTED_HOST = 'ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech';
const EXPECTED_DB = 'fairwayd_stage';
const EXPECTED_GIT_BRANCH = 'feature/golf-near-me-ch-pilot';
const EXPECTED_VENUE_ID = 'pilot-ch-rheinfelden-the-golf-lounge-20261023';
const EXPECTED_MIGRATION = '20261021185500_add_golf_service_directory';

function stop(message) { throw new Error(message); }
function checkGitAndBuild() {
  let branch;
  try {
    branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: ROOT, encoding: 'utf8', windowsHide: true,
    }).trim();
  } catch { stop('Cannot verify the local Git branch.'); }
  if (branch !== EXPECTED_GIT_BRANCH) stop('STOP: Wrong feature branch.');
  for (const p of [
    'dist/src/prisma/prisma.service.js',
    'dist/src/golf-services/golf-services.service.js',
    'dist/src/golf-services/golf-services.controller.js',
  ]) {
    if (!fs.existsSync(path.join(ROOT, p))) {
      stop('API build missing; run npm run build in apps/api first.');
    }
  }
}

function safeConnectionUrl() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw) stop('Missing temporary NEON_DATABASE_URL. Use the secure PowerShell launcher.');
  let u;
  try { u = new URL(raw.trim()); } catch { stop('Invalid PostgreSQL URL.'); }
  if (!['postgresql:', 'postgres:'].includes(u.protocol)
      || u.hostname.toLowerCase() !== EXPECTED_HOST
      || u.hostname.includes('-pooler.')
      || decodeURIComponent(u.pathname.replace(/^\//, '')) !== EXPECTED_DB
      || !u.username || !u.password
      || !['require', 'verify-full'].includes(u.searchParams.get('sslmode'))) {
    stop('STOP: Connection is NOT the pinned direct Prisma-rehearsal database.');
  }
  // Enforce read-only transactions on every connection, including the Prisma pool.
  u.searchParams.set('options', '-c default_transaction_read_only=on');
  return u.toString();
}

async function assertDatabase(url) {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  try {
    await pg.connect();
    await pg.query('BEGIN READ ONLY');
    const row = (await pg.query(
      "SELECT current_database() AS db, current_setting('default_transaction_read_only') AS default_ro, " +
      "current_setting('transaction_read_only') AS transaction_ro, " +
      "(SELECT count(*)::int FROM public.\"_prisma_migrations\" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrated, " +
      "(SELECT count(*)::int FROM public.\"GolfServiceVenue\" WHERE id=$2 AND status='VERIFIED' AND \"verifiedAt\" IS NOT NULL) AS venue_count, " +
      "(SELECT count(*)::int FROM public.\"GolfServiceOffering\" WHERE \"venueId\"=$2 AND status='VERIFIED') AS offer_count, " +
      "(SELECT count(*)::int FROM public.\"GolfServiceVenueProvider\" WHERE \"venueId\"=$2 AND status='VERIFIED') AS provider_links",
      [EXPECTED_MIGRATION, EXPECTED_VENUE_ID],
    )).rows[0];
    if (row.db !== EXPECTED_DB || row.default_ro !== 'on' ||
        row.transaction_ro !== 'on' || row.migrated !== 1 ||
        row.venue_count !== 1 || row.offer_count !== 4 || row.provider_links !== 1) {
      stop('STOP: Unexpected test DB data, migration history or read-only mode.');
    }
    await pg.query('ROLLBACK');
    console.log('Preflight PASS: isolated database, read-only, 1 venue, 4 offers, 1 pro link.');
  } finally {
    try { await pg.query('ROLLBACK'); } catch { /* ignore */ }
    await pg.end().catch(() => {});
  }
}

function checkItems(response, category) {
  assert.equal(response.status, 200, 'Expected HTTP 200');
  assert.equal(response.body.count, 1, 'Expected one independent test venue');
  assert.equal(response.body.items.length, 1, 'Expected exactly one location card/marker');
  const venue = response.body.items[0];
  assert.equal(venue.id, EXPECTED_VENUE_ID);
  assert.equal(venue.name, 'The Golf Lounge');
  assert.equal(venue.city, 'Rheinfelden');
  assert.equal(venue.country, 'CH');
  assert.equal(venue.lat, 47.5495127);
  assert.equal(venue.lon, 7.786086);
  assert.equal(venue.offerings.length, category ? 1 : 4);
  if (category) assert.equal(venue.offerings[0].category, category);
  assert.ok(Array.isArray(venue.venueProviders));
  assert.equal(venue.venueProviders.length, 1);
  assert.equal(venue.venueProviders[0].provider.name, 'Sebastian Heijdenberg');
  for (const hidden of ['reviewNotes', 'googlePlaceId', 'osmRef',
    'sourceKind', 'sourceUrl', 'verifiedAt']) {
    assert.equal(Object.hasOwn(venue, hidden), false,
      'Sensitive/internal field leaked: ' + hidden);
  }
  assert.equal(response.body.courseServices.length, 0, 'Do not fabricate Course associations');
  return venue;
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--run') {
    stop('Use the isolated PowerShell launcher; --run is mandatory.');
  }
  checkGitAndBuild();
  const safeUrl = safeConnectionUrl();
  await assertDatabase(safeUrl);
  process.env.NEON_DATABASE_URL = safeUrl;
  process.env.GOLF_SERVICES_API_ENABLED = 'false';

  require('reflect-metadata');
  const { Module, ValidationPipe } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const request = require('supertest');
  const { PrismaService } = require(path.join(ROOT, 'dist/src/prisma/prisma.service.js'));
  const { GolfServicesService } = require(path.join(ROOT, 'dist/src/golf-services/golf-services.service.js'));
  const { GolfServicesController } = require(path.join(ROOT, 'dist/src/golf-services/golf-services.controller.js'));

  class IsolatedGolfServicesApiModule {}
  Module({
    controllers: [GolfServicesController],
    providers: [PrismaService, GolfServicesService],
  })(IsolatedGolfServicesApiModule);
  let app;
  try {
    app = await NestFactory.create(IsolatedGolfServicesApiModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer();
    const client = app.get(PrismaService);
    const ro = await client.$queryRawUnsafe("SELECT current_setting('default_transaction_read_only') AS mode");
    assert.equal(ro[0].mode, 'on', 'Prisma pool is not read-only');
    const http = (url) => request(server).get(url).timeout({ deadline: 15000 });
    const location = '/api/golf-services/nearby?lat=47.5495127&lon=7.786086&radiusKm=10';

    // Confirm the feature remains closed unless explicitly enabled.
    let reply = await http(location + '&category=SIMULATOR');
    assert.equal(reply.status, 503, 'Feature flag must disable the endpoint');
    console.log('PASS: Disabled feature returns HTTP 503.');

    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    reply = await http(location + '&category=SIMULATOR');
    const near = checkItems(reply, 'SIMULATOR');
    assert.equal(near.offerings[0].unitCount, 2);
    assert.equal(near.distanceKm, 0);
    console.log('PASS: Simulators -> one real venue, 2 simulators, SebbyGolf instructor.');

    reply = await http(location + '&category=SHOP');
    checkItems(reply, 'SHOP');
    console.log('PASS: Shop filter returns the same venue once.');

    reply = await http(location + '&category=RANGE');
    assert.equal(reply.status, 200);
    assert.equal(reply.body.items.length, 0);
    console.log('PASS: No driving range is fabricated.');

    reply = await http('/api/golf-services/nearby?lat=47.5596&lon=7.5886&radiusKm=25');
    const basel = checkItems(reply);
    assert.ok(basel.distanceKm > 10 && basel.distanceKm < 25);
    console.log('PASS: Basel 25km search finds the venue with actual calculated distance: ' +
      basel.distanceKm + ' km.');

    reply = await http(location + '&country=FR&category=SIMULATOR');
    assert.equal(reply.status, 200);
    assert.equal(reply.body.items.length, 0);
    console.log('PASS: Country filter prevents a false French listing.');

    reply = await http('/api/golf-services?country=CH&region=Aargau&category=SIMULATOR&take=10');
    assert.equal(reply.status, 200);
    assert.equal(reply.body.items.length, 1);
    assert.equal(reply.body.items[0].name, 'The Golf Lounge');
    console.log('PASS: Regional golf-services API returns the expected venue.');
    console.log('PASS: All isolated HTTP API smoke tests succeeded; no data changed.');
  } finally {
    process.env.GOLF_SERVICES_API_ENABLED = 'false';
    if (app) await app.close().catch(() => {});
  }
}

main().catch((err) => {
  // Suppress driver/framework error details to avoid accidental credential output.
  if (err instanceof Error && (
    err.message.startsWith('STOP:') || err.message.startsWith('Use the isolated') ||
    err.message.startsWith('Missing temporary') || err.message.startsWith('Invalid PostgreSQL') ||
    err.message.startsWith('Cannot verify') || err.message.startsWith('API build missing'))) {
    console.error(err.message);
  } else {
    console.error('FAIL: Isolated live-API test failed. Check the most recent PASS line. Do not paste the database URL.');
  }
  process.exitCode = 1;
});
