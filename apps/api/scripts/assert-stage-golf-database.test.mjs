import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  appliesToStage, isExactStageService, isStageDatabaseUrl,
} from './assert-stage-golf-database.mjs';

const bin = fileURLToPath(new URL('./assert-stage-golf-database.mjs', import.meta.url));
const name = 'fairwayd-stage';
const id = 'c11e6e17-8fea-40b6-9380-f56a44e9a28d';
const base = 'postgresql://someuser:password@ep-restless-wildflower-agf67w6m.c-2.eu-central-1.aws.neon.tech/fairwayd_stage?sslmode=require';

test('Stage identity is exact', () => {
  assert.equal(appliesToStage(name, id), true);
  assert.equal(isExactStageService(name, id), true);
  assert.equal(appliesToStage(name, 'wrong'), true);
  assert.equal(isExactStageService(name, 'wrong'), false);
  assert.equal(appliesToStage('fairwayd', 'other'), false);
});
test('direct Stage Neon host and database accepted', () => assert.equal(isStageDatabaseUrl(base), true));
test('Stage pooled host accepted', () => assert.equal(isStageDatabaseUrl(base.replace('agf67w6m.c-2', 'agf67w6m-pooler.c-2')), true));
test('production Neon host rejected', () => assert.equal(isStageDatabaseUrl(base.replace('ep-restless-wildflower-agf67w6m', 'ep-lingering-pine-ag2rjgsv')), false));
test('default neondb database rejected', () => assert.equal(isStageDatabaseUrl(base.replace('/fairwayd_stage', '/neondb')), false));
test('missing secret rejected', () => assert.equal(isStageDatabaseUrl(''), false));
test('disabled TLS mode rejected', () => assert.equal(isStageDatabaseUrl(base.replace('require', 'disable')), false));
test('not dependent on URL sslmode spelling; TLS is checked on actual connection', () => {
  assert.equal(isStageDatabaseUrl(base.replace('?sslmode=require', '')), true);
  assert.equal(isStageDatabaseUrl(base.replace('require', 'verify-full')), true);
});
test('regular Production service does not use Stage gate', () => {
  const p = spawnSync(process.execPath, [bin], { encoding: 'utf8', env: {
    ...process.env,
    RAILWAY_SERVICE_NAME: 'fairwayd',
    RAILWAY_SERVICE_ID: 'c6c5e2e7-31d0-4e63-94e6-051cdecf4536',
  }});
  assert.equal(p.status, 0);
  assert.match(p.stdout, /not applicable/);
});
test('wrong Stage ID fails closed before opening a database connection', () => {
  const p = spawnSync(process.execPath, [bin], { encoding: 'utf8', env: {
    ...process.env,
    RAILWAY_SERVICE_NAME: 'fairwayd',
    RAILWAY_SERVICE_ID: id,
    NEON_DATABASE_URL: base,
  }});
  assert.equal(p.status, 1);
  assert.match(p.stderr, /STOP:/);
  assert.doesNotMatch(p.stderr, /password|postgresql:\/\//);
});
