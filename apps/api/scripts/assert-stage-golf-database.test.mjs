import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const bin = fileURLToPath(new URL('./assert-stage-golf-database.mjs', import.meta.url));
const base = {
  ...process.env,
  RAILWAY_SERVICE_NAME: 'fairwayd-stage',
  RAILWAY_SERVICE_ID: 'c11e6e17-8fea-40b6-9380-f56a44e9a28d',
  NEON_DATABASE_URL: 'postgresql://someuser:password@ep-restless-wildflower-agf67w6m.c-2.eu-central-1.aws.neon.tech/fairwayd_stage?sslmode=require',
};
function run(change) {
  const p = spawnSync(process.execPath, [bin], { encoding: 'utf8', env: { ...base, ...change } });
  const msg = (p.stdout + p.stderr);
  assert.doesNotMatch(msg, /password|someuser|postgresql:\/\//);
  return p;
}
test('Stage explicit direct Neon host and DB accepted', () => assert.equal(run({}).status, 0));
test('Stage pooled Neon host accepted', () => assert.equal(run({NEON_DATABASE_URL: base.NEON_DATABASE_URL.replace('agf67w6m.c-2','agf67w6m-pooler.c-2')}).status, 0));
test('production Neon host rejected', () => assert.equal(run({NEON_DATABASE_URL: base.NEON_DATABASE_URL.replace('ep-restless-wildflower-agf67w6m','ep-lingering-pine-ag2rjgsv')}).status, 1));
test('default neondb database rejected', () => assert.equal(run({NEON_DATABASE_URL: base.NEON_DATABASE_URL.replace('/fairwayd_stage','/neondb')}).status, 1));
test('incorrect Stage name / id rejected', () => assert.equal(run({RAILWAY_SERVICE_ID:'other'}).status, 1));
test('missing secret rejected', () => assert.equal(run({NEON_DATABASE_URL:''}).status, 1));
test('untrusted SSL mode rejected', () => assert.equal(run({NEON_DATABASE_URL:base.NEON_DATABASE_URL.replace('require','disable')}).status, 1));
test('regular prod Railway service untouched', () => assert.equal(run({RAILWAY_SERVICE_NAME:'fairwayd',RAILWAY_SERVICE_ID:'c6c5e2e7-31d0-4e63-94e6-051cdecf4536'}).status, 0));
