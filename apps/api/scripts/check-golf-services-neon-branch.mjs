#!/usr/bin/env node
// Security-first, read-only preflight for a separate Neon golf-services test branch.
// NEVER reads apps/api/.env or inherited NEON_DATABASE_URL / DATABASE_URL.
// No schema changes, migrations, data changes or Google API calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

function option(name) {
  const prefix = '--' + name + '=';
  const pair = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return pair ? pair.slice(prefix.length).trim() : '';
}

function fail(message) {
  throw new Error(message);
}

async function run() {
  const envPathInput = option('env');
  const expectedHost = option('expected-host').toLowerCase();
  if (!envPathInput || !expectedHost ||
      process.argv.length !== 4 ||
      !process.argv[2].startsWith('--env=') && !process.argv[3].startsWith('--env=')) {
    fail('Usage: node scripts/check-golf-services-neon-branch.mjs --env=PATH --expected-host=ep-xxxxx.REGION.aws.neon.tech');
  }

  const envPath = path.resolve(envPathInput);
  const projectRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  const rel = path.relative(projectRoot, envPath);
  if (!rel.startsWith('..' + path.sep) && rel !== '..' || rel === '') {
    fail('Secrets file must be outside the Fairwayd Git repository.');
  }
  if (!fs.existsSync(envPath)) fail('Secrets file not found at the specified path.');

  const localEnv = dotenv.parse(fs.readFileSync(envPath));
  const connectionString = localEnv.NEON_DATABASE_URL;
  if (!connectionString) fail('Secrets file must contain NEON_DATABASE_URL.');
  let url;
  try { url = new URL(connectionString); }
  catch { fail('Invalid PostgreSQL connection URL.'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    fail('Connection URL must use postgresql://.');
  }
  const actualHost = url.hostname.toLowerCase();
  if (!actualHost.endsWith('.neon.tech')) fail('Database host is not a Neon host.');
  if (actualHost.includes('-pooler.')) fail('Use the direct Neon connection (disable Connection pooling in Neon).');
  if (actualHost !== expectedHost) fail('Hostname does not match the expected test-branch endpoint from Neon console.');
  if (!['require', 'verify-full'].includes(url.searchParams.get('sslmode'))) {
    fail('Connection string must specify sslmode=require or sslmode=verify-full.');
  }

  console.log('Expected test Neon host matches: ' + actualHost);
  console.log('Opening read-only database session (no migrations, no writes)...');
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 8000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    const result = await client.query(
      'SELECT current_database() AS database_name, ' +
      "current_setting('transaction_read_only') AS read_only, " +
      "to_regclass('public.\"GolfServiceVenue\"') IS NOT NULL AS migration_already_present"
    );
    const info = result.rows[0];
    if (info.read_only !== 'on') fail('Database did not honor READ ONLY transaction.');
    console.log('Database: ' + info.database_name);
    console.log('Read-only transaction: ' + info.read_only);
    console.log('Golf Services tables already present: ' + info.migration_already_present);

    // Compare migration history without invoking Prisma CLI or allowing writes.
    const migrationsFolder = fileURLToPath(new URL('../prisma/migrations/', import.meta.url));
    const localMigrations = fs.readdirSync(migrationsFolder, { withFileTypes: true })
      .filter((item) => item.isDirectory() && /^\\d{14}_/.test(item.name))
      .map((item) => item.name)
      .sort();

    const historyCheck = await client.query(
      "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS has_history"
    );
    if (!historyCheck.rows[0].has_history) {
      fail('Prisma migrations history is missing; do not run migrate deploy.');
    }
    const migrationRows = await client.query(
      'SELECT migration_name, finished_at IS NOT NULL AS finished, ' +
      'rolled_back_at IS NOT NULL AS rolled_back ' +
      'FROM public."_prisma_migrations" ORDER BY started_at'
    );
    const completed = new Set(
      migrationRows.rows
        .filter((entry) => entry.finished && !entry.rolled_back)
        .map((entry) => entry.migration_name)
    );
    const failed = migrationRows.rows
      .filter((entry) => !entry.finished && !entry.rolled_back)
      .map((entry) => entry.migration_name);
    const pending = localMigrations.filter((name) => !completed.has(name));
    const unexpectedDatabaseMigrations = [...completed]
      .filter((name) => !localMigrations.includes(name));

    console.log('Applied Prisma migrations: ' + completed.size);
    console.log('Local migration folders: ' + localMigrations.length);
    console.log('Pending local migrations: ' + pending.length);
    for (const name of pending) console.log('  PENDING: ' + name);
    if (failed.length) {
      console.log('WARNING: unresolved migration(s): ' + failed.join(', '));
    }
    if (unexpectedDatabaseMigrations.length) {
      console.log('WARNING: database migrations absent locally: ' +
        unexpectedDatabaseMigrations.join(', '));
    }
    const expectedOnly = pending.length === 1 &&
      pending[0] === '20261021185500_add_golf_service_directory' &&
      failed.length === 0 && unexpectedDatabaseMigrations.length === 0 &&
      info.migration_already_present === false;
    console.log('Migration review gate: ' +
      (expectedOnly ? 'EXPECTED_SINGLE_PENDING' : 'REVIEW_REQUIRED'));
    console.log('SUCCESS: Read-only endpoint and history inspected. No data changed.');
    if (!expectedOnly) {
      fail('Migration status needs manual review; no deployment is authorized.');
    }
  } finally {
    if (connected) {
      try { await client.query('ROLLBACK'); } catch { /* best effort */ }
    }
    try { await client.end(); } catch { /* best effort */ }
  }
}

run().catch((err) => {
  // Never echo the URL, password, parsed env values or raw connection exception.
  const safePrefix = 'Connection check failed: ';
  const safeMessage = err instanceof Error
    && (err.message.startsWith('Usage:') || err.message.startsWith('Secrets file')
      || err.message.startsWith('Connection URL') || err.message.startsWith('Database host')
      || err.message.startsWith('Hostname does not')
      || err.message.startsWith('Invalid PostgreSQL') || err.message.startsWith('Use the direct')
      || err.message.startsWith('Database did not')
      || err.message.startsWith('Prisma migrations history')
      || err.message.startsWith('Migration status needs'))
    ? err.message
    : 'Unable to connect or complete the read-only check. Confirm the test branch host, credentials, and SSL in Neon.';
  console.error(safePrefix + safeMessage);
  process.exitCode = 1;
});
