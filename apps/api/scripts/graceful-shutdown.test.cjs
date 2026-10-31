const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

function fixture(timeout) {
  const modulePath = path.resolve(__dirname, '../dist/src/runtime/graceful-shutdown.js');
  const child = spawn(process.execPath, ['-e', `
    const http = require('node:http');
    const { installGracefulShutdown } = require(${JSON.stringify(modulePath)});
    let response;
    let finished = false;
    const server = http.createServer((_req, res) => { response = res; process.send({ event: 'active' }); });
    installGracefulShutdown({ getHttpServer: () => server, close: async () => {
      if (!finished) throw new Error('Resources closed before HTTP completed');
      process.send({ event: 'resources-closed' });
    } }, { beginShutdown: () => process.send({ event: 'draining' }) }, ${timeout});
    process.on('message', () => { finished = true; response.end('completed'); });
    server.listen(0, '127.0.0.1', () => process.send({ event: 'listening', port: server.address().port }));
  `], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const messages = [];
  child.on('message', message => messages.push(message));
  let logs = '';
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  const exit = new Promise(resolve => child.on('exit', (code, signal) => resolve({ code, signal })));
  async function wait(event) {
    const deadline = Date.now() + 5000;
    while (!messages.some(m => m.event === event)) {
      if (Date.now() > deadline || child.exitCode !== null) throw new Error('Missing ' + event + ': ' + logs);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return messages.find(m => m.event === event);
  }
  return { child, messages, wait, exit, logs: () => logs };
}

test('SIGTERM drains an active keep-alive HTTP request before resource destruction', { timeout: 10000 }, async t => {
  const f = fixture(5000);
  t.after(() => { if (f.child.exitCode === null) f.child.kill('SIGKILL'); });
  const { port } = await f.wait('listening');
  const result = new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/slow', headers: { Connection: 'keep-alive' } }, res => {
      let body = ''; res.on('data', data => { body += data; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
  await f.wait('active');
  f.child.kill('SIGTERM');
  await f.wait('draining');
  assert.equal(f.child.exitCode, null);
  assert.ok(!f.messages.some(m => m.event === 'resources-closed'));
  // Duplicate stop signals must not bypass the drain.
  f.child.kill('SIGTERM');
  f.child.send({ finish: true });
  assert.deepEqual(await result, { status: 200, body: 'completed' });
  assert.deepEqual(await f.exit, { code: 0, signal: null });
  assert.ok(f.messages.some(m => m.event === 'resources-closed'));
});

test('an indefinitely hanging request is bounded by the shutdown deadline', { timeout: 10000 }, async t => {
  const f = fixture(150);
  t.after(() => { if (f.child.exitCode === null) f.child.kill('SIGKILL'); });
  const { port } = await f.wait('listening');
  const req = http.get({ host: '127.0.0.1', port, path: '/hang' });
  req.on('error', () => {});
  await f.wait('active'); f.child.kill('SIGTERM');
  assert.deepEqual(await f.exit, { code: 1, signal: null });
  assert.match(f.logs(), /Shutdown deadline exceeded/);
  assert.ok(!f.messages.some(m => m.event === 'resources-closed'));
  req.destroy();
});
