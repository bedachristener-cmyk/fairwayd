#!/usr/bin/env node
// One-off Prisma migration rehearsal. Fails closed unless the connection
// points to the explicitly created disposable Neon child (NOT Stage/Production).
// Never logs or writes credentials; no .env file changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync, execFileSync } from 'node:child_process';
import pg from 'pg';

const EXPECTED_HOST = 'ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech';
const EXPECTED_DB = 'fairwayd_stage';
const EXPECTED_GIT_BRANCH = 'feature/golf-near-me-ch-pilot';
const EXPECTED_MIGRATION = '20261021185500_add_golf_service_directory';
const EXPECTED_PREVIOUS_MIGRATIONS = 59;
const API_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);

function stop(message) {
  throw new Error(message);
}

function connectionString() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw) stop('NEON_DATABASE_URL must be entered locally in the protected prompt.');
  let url;
  try { url = new URL(raw); }
  catch { stop('Invalid PostgreSQL URL.'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) stop('Expected a PostgreSQL URL.');
  if (url.hostname.toLowerCase() !== EXPECTED_HOST) {
    stop('STOP: Host does not match the dedicated Prisma rehearsal branch.');
  }
  if (url.hostname.includes('-pooler.')) {
    stop('STOP: Prisma migration requires the direct (non-pooler) Neon endpoint.');
  }
  if (decodeURIComponent(url.pathname.replace(/^\//, '')) !== EXPECTED_DB) {
    stop('STOP: Database must be fairwayd_stage, not neondb.');
  }
  if (!url.username || !url.password) stop('Database credentials are missing.');
  if (!['require', 'verify-full'].includes(url.searchParams.get('sslmode'))) {
    stop('The connection must use sslmode=require or sslmode=verify-full.');
  }
  return raw;
}

function assertRepository() {
  let branch;
  try {
    branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: API_DIR, encoding: 'utf8', windowsHide: true,
    }).trim();
  } catch { stop('Unable to verify the local Git branch.'); }
  if (branch !== EXPECTED_GIT_BRANCH) stop('STOP: Wrong local Git branch: ' + branch);
  const migrationsDir = path.join(API_DIR, 'prisma', 'migrations');
  const localMigrations = fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name).sort();
  if (localMigrations.length !== EXPECTED_PREVIOUS_MIGRATIONS + 1 ||
      localMigrations.at(-1) !== EXPECTED_MIGRATION) {
    stop('Unexpected migration set. Expected 59 applied and exactly one Golf Services migration.');
  }
  const sql = fs.readFileSync(path.join(migrationsDir, EXPECTED_MIGRATION, 'migration.sql'), 'utf8');
  for (const token of [
    'GolfServiceOffering_exclusive_owner_check',
    'GolfServiceVenueProvider_exclusive_owner_check',
    'GolfServiceOffering_courseId_fkey',
    'GolfServiceVenueProvider_courseId_fkey',
  ]) {
    if (!sql.includes(token)) stop('STOP: Required SQL constraint missing: ' + token);
  }
  return localMigrations;
}

async function readState(raw, localMigrations, before) {
  const client = new pg.Client({ connectionString: raw, connectionTimeoutMillis: 10000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    const info = (await client.query(
      'SELECT current_database() AS db, ' +
      "current_setting('transaction_read_only') AS read_only, " +
      "to_regclass('public.\"Course\"') IS NOT NULL AS has_course, " +
      "to_regclass('public.\"GolfServiceVenue\"') IS NOT NULL AS has_services, " +
      "to_regclass('public.\"GolfServiceOffering\"') IS NOT NULL AS has_offerings"
    )).rows[0];
    if (info.db !== EXPECTED_DB || info.read_only !== 'on' || !info.has_course) {
      stop('STOP: Target database identity / read-only check failed.');
    }
    const migrationRows = (await client.query(
      'SELECT migration_name, finished_at IS NOT NULL AS completed, ' +
      'rolled_back_at IS NOT NULL AS rolled_back FROM public."_prisma_migrations"'
    )).rows;
    const completed = new Set(migrationRows.filter((r) => r.completed && !r.rolled_back)
      .map((r) => r.migration_name));
    const failed = migrationRows.filter((r) => !r.completed && !r.rolled_back);
    const unknown = [...completed].filter((name) => !localMigrations.includes(name));
    const pending = localMigrations.filter((name) => !completed.has(name));
    if (failed.length || unknown.length) stop('STOP: Unresolved or unexpected migration history.');
    if (before) {
      if (completed.size !== EXPECTED_PREVIOUS_MIGRATIONS ||
          pending.length !== 1 || pending[0] !== EXPECTED_MIGRATION ||
          info.has_services || info.has_offerings) {
        stop('STOP: Test DB is not in the expected pristine 59/60 migration state.');
      }
      console.log('Preflight OK: isolated host, fairwayd_stage, 59 applied, one pending migration.');
    } else {
      if (completed.size !== EXPECTED_PREVIOUS_MIGRATIONS + 1 ||
          pending.length !== 0 || !info.has_services || !info.has_offerings) {
        stop('POSTCHECK FAILED: Prisma migration history or new tables incomplete.');
      }
      console.log('Postcheck OK: 60 migrations applied; new service tables exist.');
    }
    await client.query('ROLLBACK');
  } finally {
    if (connected) {
      try { await client.query('ROLLBACK'); } catch { /* best effort */ }
    }
    try { await client.end(); } catch { /* best effort */ }
  }
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--apply') {
    stop('Use --apply explicitly; this tool only operates on the pinned disposable Neon branch.');
  }
  const raw = connectionString();
  const localMigrations = assertRepository();
  await readState(raw, localMigrations, true);
  const packageFile = require.resolve('prisma/package.json');
  const prismaPackage = require('prisma/package.json');
  const cli = path.resolve(path.dirname(packageFile),
    typeof prismaPackage.bin === 'string' ? prismaPackage.bin : prismaPackage.bin.prisma);
  if (!fs.existsSync(cli)) stop('The local Prisma CLI is missing. Install dependencies first.');
  console.log('Running Prisma migrate deploy against the pinned disposable branch ONLY.');
  const run = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
    cwd: API_DIR, env: { ...process.env, NEON_DATABASE_URL: raw },
    stdio: 'inherit', windowsHide: true,
  });
  if (run.error || run.status !== 0) stop('Prisma migrate deploy failed; rehearsal branch requires review.');
  await readState(raw, localMigrations, false);
  console.log('PASS: Prisma migration rehearsal completed; Stage and Production not targeted.');
}

main().catch((err) => {
  // Deliberately do not echo pg, URL, CLI or connection errors: credentials
  // must never appear in terminal logs, GitHub, or chat transcripts.
  const safe = err instanceof Error && (
    err.message.startsWith('STOP:') || err.message.startsWith('Use --apply') ||
    err.message.startsWith('Invalid PostgreSQL') ||
    err.message.startsWith('Expected a PostgreSQL') ||
    err.message.startsWith('Database credentials') ||
    err.message.startsWith('The connection must') ||
    err.message.startsWith('NEON_DATABASE_URL') ||
    err.message.startsWith('Unable to verify') ||
    err.message.startsWith('Unexpected migration') ||
    err.message.startsWith('The local Prisma') ||
    err.message.startsWith('Prisma migrate deploy failed') ||
    err.message.startsWith('POSTCHECK FAILED')
  );
  console.error(safe ? err.message : 'Migration rehearsal blocked by a connection or unexpected runtime error.');
  process.exitCode = 1;
});
