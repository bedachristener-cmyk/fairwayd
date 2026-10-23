#!/usr/bin/env node
// Fail closed before Prisma migrate deploy when this build runs on the Railway
// fairwayd-stage API. Never log credentials, full URLs, or connection details.
const STAGE_SERVICE_ID = 'c11e6e17-8fea-40b6-9380-f56a44e9a28d';
const STAGE_SERVICE_NAME = 'fairwayd-stage';
const STAGE_DATABASE = 'fairwayd_stage';
const STAGE_HOSTS = new Set([
  'ep-restless-wildflower-agf67w6m.c-2.eu-central-1.aws.neon.tech',
  'ep-restless-wildflower-agf67w6m-pooler.c-2.eu-central-1.aws.neon.tech',
]);

function stop() {
  console.error('STOP: Railway fairwayd-stage Neon connection is not the expected Stage database. No migrations were started.');
  process.exitCode = 1;
}

const name = process.env.RAILWAY_SERVICE_NAME;
const id = process.env.RAILWAY_SERVICE_ID;
if (name === STAGE_SERVICE_NAME || id === STAGE_SERVICE_ID) {
  if (name !== STAGE_SERVICE_NAME || id !== STAGE_SERVICE_ID) {
    stop();
  } else {
    let url;
    try { url = new URL(process.env.NEON_DATABASE_URL || ''); } catch { /* fail below */ }
    const valid = url &&
      (url.protocol === 'postgresql:' || url.protocol === 'postgres:') &&
      STAGE_HOSTS.has(url.hostname.toLowerCase()) &&
      decodeURIComponent(url.pathname.replace(/^\//, '')) === STAGE_DATABASE &&
      url.username && url.password &&
      (url.searchParams.get('sslmode') === 'require' || url.searchParams.get('sslmode') === 'verify-full');
    if (!valid) stop();
    else console.log('PASS: Railway fairwayd-stage is pinned to verified Neon Stage database; migrations may proceed.');
  }
} else {
  // This gate intentionally leaves normal local builds and the production
  // fairwayd service's existing startup behavior unchanged.
  console.log('Non-Stage Railway service: Stage database gate not applicable.');
}
