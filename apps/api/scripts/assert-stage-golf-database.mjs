#!/usr/bin/env node
// A fail-closed, read-only connectivity gate before prisma migrate deploy.
// This guard affects ONLY the existing fairwayd-stage Railway service.
// It never echoes a connection URL, credentials, or a database error message.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const STAGE_SERVICE_ID = 'c11e6e17-8fea-40b6-9380-f56a44e9a28d';
const STAGE_SERVICE_NAME = 'fairwayd-stage';
const STAGE_DATABASE = 'fairwayd_stage';
const STAGE_HOSTS = new Set([
  'ep-restless-wildflower-agf67w6m.c-2.eu-central-1.aws.neon.tech',
  'ep-restless-wildflower-agf67w6m-pooler.c-2.eu-central-1.aws.neon.tech',
]);

export function appliesToStage(name, id) {
  return name === STAGE_SERVICE_NAME || id === STAGE_SERVICE_ID;
}

export function isExactStageService(name, id) {
  return name === STAGE_SERVICE_NAME && id === STAGE_SERVICE_ID;
}

export function isStageDatabaseUrl(raw) {
  let url;
  try { url = new URL(raw || ''); } catch { return false; }
  const sslmode = url.searchParams.get('sslmode');
  return (
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
    STAGE_HOSTS.has(url.hostname.toLowerCase()) &&
    decodeURIComponent(url.pathname.replace(/^\//, '')) === STAGE_DATABASE &&
    !!url.username && !!url.password &&
    // Actual TLS is checked via PostgreSQL below, not a URL spelling.
    !['disable', 'allow', 'prefer'].includes((sslmode || '').toLowerCase())
  );
}

export async function verifyEncryptedStageConnection(raw) {
  const require = createRequire(import.meta.url);
  const { Client } = require('pg');
  const client = new Client({ connectionString: raw, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    // Neon terminates client TLS at its proxy. pg_stat_ssl inside the
    // compute can show false even for a secure client connection. Inspect
    // the actual pg client-side socket instead.
    if (client.connection?.stream?.encrypted !== true) return false;
    const result = await client.query('SELECT current_database() AS db');
    return result.rows.length === 1 && result.rows[0].db === STAGE_DATABASE;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const name = process.env.RAILWAY_SERVICE_NAME;
  const id = process.env.RAILWAY_SERVICE_ID;
  if (!appliesToStage(name, id)) {
    console.log('Non-Stage Railway service: Stage database gate not applicable.');
    return;
  }
  const connection = process.env.NEON_DATABASE_URL;
  if (!isExactStageService(name, id) || !isStageDatabaseUrl(connection)) {
    throw new Error('stage-db-check-failed');
  }
  if (!await verifyEncryptedStageConnection(connection)) {
    throw new Error('stage-db-check-failed');
  }
  console.log('PASS: Railway fairwayd-stage is using verified Neon Stage database over TLS.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(() => {
    console.error('STOP: The fairwayd-stage DB identity/TLS check failed. No Prisma migrations were started.');
    process.exitCode = 1;
  });
}
