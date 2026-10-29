const { rmSync } = require('fs');
const { join } = require('path');
const { spawn } = require('child_process');
const net = require('net');

const root = join(__dirname, '..');
const dist = join(root, 'dist');
const nestBin = join(root, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
const main = join(root, 'dist', 'src', 'main.js');
const port = Number(process.env.PORT || 3000);

let app = null;
let restartChain = Promise.resolve();

rmSync(dist, { recursive: true, force: true });

const compiler = spawn(process.execPath, [nestBin, 'build', '--watch'], {
  cwd: root,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

function write(stream, chunk) {
  stream.write(chunk);
  return chunk.toString();
}

function startApp() {
  app = spawn(process.execPath, [main], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });

  app.on('exit', () => {
    app = null;
  });
}

function stopApp() {
  return new Promise((resolve) => {
    if (!app) return resolve();

    const child = app;
    const timer = setTimeout(() => {
      if (app === child) child.kill('SIGKILL');
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPortFree() {
  const deadline = Date.now() + 10000;

  while (await canConnect()) {
    if (Date.now() > deadline) {
      console.error(`Port ${port} is still in use; API process was not restarted.`);
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return true;
}

function restartApp() {
  restartChain = restartChain
    .then(stopApp)
    .then(waitForPortFree)
    .then((isPortFree) => {
      if (isPortFree) startApp();
    })
    .catch((err) => {
      console.error('Failed to restart API process', err);
    });
}

function handleCompilerOutput(text) {
  if (text.includes('Found 0 errors. Watching for file changes.')) {
    restartApp();
  }
}

compiler.stdout.on('data', (chunk) => {
  handleCompilerOutput(write(process.stdout, chunk));
});

compiler.stderr.on('data', (chunk) => {
  handleCompilerOutput(write(process.stderr, chunk));
});

compiler.on('exit', async (code, signal) => {
  await stopApp();
  process.exitCode = code ?? (signal ? 1 : 0);
});

async function shutdown() {
  compiler.kill('SIGTERM');
  await stopApp();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
