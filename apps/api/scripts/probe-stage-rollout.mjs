// Read-only availability probe. Intentionally restricted to the known Stage API.
import { appendFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://fairwayd-stage-production.up.railway.app';
const duration = Number(process.argv.find(arg => arg.startsWith('--seconds='))?.split('=')[1] ?? 600);
const output = process.argv.find(arg => arg.startsWith('--out='))?.slice(6);
if (!output || !Number.isFinite(duration) || duration < 30 || duration > 1800) {
  throw new Error('Usage: node scripts/probe-stage-rollout.mjs --seconds=600 --out=/tmp/stage-probe.jsonl');
}
const routes = ['/api/health', '/api/ready', '/api/courses/search?q=Basel&take=1'];
await writeFile(output, '');
const until = Date.now() + duration * 1000;
let total = 0, failures = 0;
const deployments = new Set();
while (Date.now() < until) {
  const tick = Date.now();
  const rows = await Promise.all(routes.map(async path => {
    const started = Date.now();
    try {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
      let deployment;
      if (path === '/api/ready' && response.ok) {
        const body = await response.json();
        deployment = typeof body.deployment === 'string' ? body.deployment : undefined;
      } else { await response.arrayBuffer(); }
      return { at: new Date(started).toISOString(), path, status: response.status, ms: Date.now() - started, ...(deployment ? { deployment } : {}) };
    } catch (error) {
      return { at: new Date(started).toISOString(), path, status: 0, ms: Date.now() - started, error: error?.name ?? 'Error' };
    }
  }));
  for (const row of rows) {
    total++; if (row.status !== 200) failures++;
    if (row.deployment) deployments.add(row.deployment);
  }
  await appendFile(output, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
  await delay(Math.max(0, 1000 - (Date.now() - tick)));
}
console.log(JSON.stringify({ total, failures, deployments: [...deployments], output }));
if (failures) process.exitCode = 1;
