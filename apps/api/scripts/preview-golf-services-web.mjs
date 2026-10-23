#!/usr/bin/env node
// Local read-only *browser UI* rehearsal using the disposable Golf Near Me
// Prisma-test child branch. Runs a minimal loopback-only Golf Services API and
// a separate Vite instance on port 5195. Does not touch the standard dev API
// (port 3000), any deployed API, migrations, or .env files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const API_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WEB_ROOT = path.resolve(API_ROOT, '..', 'web');
const EXPECTED_HOST = 'ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech';
const EXPECTED_DB = 'fairwayd_stage';
const EXPECTED_BRANCH = 'feature/golf-near-me-ch-pilot';
const EXPECTED_MIGRATION = '20261021185500_add_golf_service_directory';
const EXPECTED_VENUE = 'pilot-ch-rheinfelden-the-golf-lounge-20261023';
const WEB_PORT = 5195;

function fail(reason) { throw new Error(reason); }
function preflightFiles() {
  const branch = execFileSync('git', ['branch', '--show-current'], {
    cwd: API_ROOT, encoding: 'utf8', windowsHide: true,
  }).trim();
  if (branch !== EXPECTED_BRANCH) fail('STOP: Wrong Git branch (requires Golf Near Me feature branch).');
  for (const f of [
    'dist/src/prisma/prisma.service.js',
    'dist/src/golf-services/golf-services.service.js',
    'dist/src/golf-services/golf-services.controller.js',
  ]) {
    if (!fs.existsSync(path.join(API_ROOT, f))) fail('STOP: API not built. Run npm run build in apps/api.');
  }
  if (!fs.existsSync(path.join(WEB_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'))) {
    fail('STOP: Vite missing. Run npm install in apps/web.');
  }
  if (!fs.readFileSync(path.join(WEB_ROOT, 'src', 'api', 'golfServices.ts'), 'utf8')
    .includes('VITE_GOLF_SERVICES_LOCAL_TEST_API_BASE')) {
    fail('STOP: Dev-only Golf Services loopback API override is missing.');
  }
}

function readOnlyConnection() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw) fail('STOP: Use the secure PowerShell launcher to enter the test connection URL.');
  let u;
  try { u = new URL(raw); } catch { fail('STOP: Malformed Neon connection URL.'); }
  if (!['postgresql:', 'postgres:'].includes(u.protocol)
      || u.hostname.toLowerCase() !== EXPECTED_HOST
      || u.hostname.includes('-pooler.')
      || decodeURIComponent(u.pathname.replace(/^\//, '')) !== EXPECTED_DB
      || !u.username || !u.password
      || !['require', 'verify-full'].includes(u.searchParams.get('sslmode'))) {
    fail('STOP: Connection is NOT the pinned, direct, disposable Neon test database.');
  }
  // Enforce read-only on each DB session, including the Prisma adapter's pool.
  u.searchParams.set('options', '-c default_transaction_read_only=on');
  return u.toString();
}

async function verifyDb(raw) {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: raw, connectionTimeoutMillis: 10000 });
  try {
    await pg.connect();
    await pg.query('BEGIN READ ONLY');
    const row = (await pg.query(
      "SELECT current_database() AS db, current_setting('transaction_read_only') AS tx_ro, " +
      "current_setting('default_transaction_read_only') AS default_ro, " +
      "(SELECT COUNT(*)::int FROM public.\"_prisma_migrations\" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrated, " +
      "(SELECT COUNT(*)::int FROM public.\"GolfServiceVenue\" WHERE id=$2 AND status='VERIFIED' AND \"verifiedAt\" IS NOT NULL) AS venue_count, " +
      "(SELECT COUNT(*)::int FROM public.\"GolfServiceOffering\" WHERE \"venueId\"=$2 AND status='VERIFIED') AS offering_count, " +
      "(SELECT COUNT(*)::int FROM public.\"GolfServiceVenueProvider\" WHERE \"venueId\"=$2 AND status='VERIFIED') AS provider_count",
      [EXPECTED_MIGRATION, EXPECTED_VENUE],
    )).rows[0];
    if (row.db !== EXPECTED_DB || row.tx_ro !== 'on' || row.default_ro !== 'on' ||
        row.migrated !== 1 || row.venue_count !== 1 ||
        row.offering_count !== 4 || row.provider_count !== 1) {
      fail('STOP: Unexpected database migration/data state or read-only mode.');
    }
    console.log('Preflight PASS: disposable database, read-only, The Golf Lounge + 4 offers + 1 Pro.');
  } finally {
    try { await pg.query('ROLLBACK'); } catch { /* best effort */ }
    await pg.end().catch(() => {});
  }
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--run') {
    fail('STOP: Start this tool with the secure PowerShell launcher, not directly.');
  }
  preflightFiles();
  const connectionString = readOnlyConnection();
  await verifyDb(connectionString);
  process.env.NEON_DATABASE_URL = connectionString;
  process.env.GOLF_SERVICES_API_ENABLED = 'true';

  require('reflect-metadata');
  const { Module, ValidationPipe } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { PrismaService } = require(path.join(API_ROOT, 'dist/src/prisma/prisma.service.js'));
  const { GolfServicesService } = require(path.join(API_ROOT, 'dist/src/golf-services/golf-services.service.js'));
  const { GolfServicesController } = require(path.join(API_ROOT, 'dist/src/golf-services/golf-services.controller.js'));

  class LocalGolfServicesOnlyModule {}
  Module({
    controllers: [GolfServicesController],
    providers: [PrismaService, GolfServicesService],
  })(LocalGolfServicesOnlyModule);

  let app = null;
  let vite = null;
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    if (vite && vite.exitCode === null) vite.kill();
    if (app) await app.close().catch(() => {});
    process.env.GOLF_SERVICES_API_ENABLED = 'false';
  }

  try {
    app = await NestFactory.create(LocalGolfServicesOnlyModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
      origin: ['http://127.0.0.1:' + WEB_PORT],
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    });
    await app.listen(0, '127.0.0.1');
    const httpPort = app.getHttpServer().address().port;
    const prisma = app.get(PrismaService);
    const check = await prisma.$queryRawUnsafe(
      "SELECT current_setting('default_transaction_read_only') AS value"
    );
    if (check[0].value !== 'on') fail('STOP: The Prisma connection is not read-only.');

    // Do not propagate ANY database credentials to the Vite frontend process.
    const webEnv = { ...process.env };
    delete webEnv.NEON_DATABASE_URL;
    delete webEnv.DATABASE_URL;
    delete webEnv.GOLF_SERVICES_API_ENABLED;
    webEnv.VITE_GOLF_SERVICES_LOCAL_TEST_API_BASE =
      'http://127.0.0.1:' + httpPort + '/api';
    const viteCli = path.join(WEB_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    vite = spawn(process.execPath, [viteCli, '--host', '127.0.0.1',
      '--port', String(WEB_PORT), '--strictPort'], {
      cwd: WEB_ROOT, env: webEnv, stdio: 'inherit', windowsHide: true,
    });

    process.once('SIGINT', () => { void stop(); });
    process.once('SIGTERM', () => { void stop(); });
    console.log('');
    console.log('ISOLATED Golf Services API: running on loopback only (read-only DB).');
    console.log('LOCAL UI TEST: http://127.0.0.1:' + WEB_PORT + '/golf-near-me');
    console.log('Use "Golfangebote finden", NOT "Basel-Pilotvorschau (lokal)".');
    console.log('Existing API and existing Vite instances are untouched.');
    console.log('Press Ctrl+C to stop the isolated test instance.');
    const status = await new Promise((resolve, reject) => {
      vite.once('error', reject);
      vite.once('exit', (code) => resolve(code));
    });
    if (!stopping && status !== 0) fail('STOP: Dedicated Vite browser process exited unsuccessfully.');
  } finally {
    await stop();
  }
}

main().catch((err) => {
  const safe = err instanceof Error && err.message.startsWith('STOP:');
  console.error(safe ? err.message :
    'STOP: Unexpected local UI test error (details suppressed to avoid leaking credentials).');
  process.exitCode = 1;
});
