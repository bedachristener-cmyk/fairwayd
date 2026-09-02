// Runs Playwright E2E tests against a Vite server owned by this wrapper.
// This avoids Playwright's Windows webServer teardown path while preserving
// Playwright's exit code and cleaning up only the Vite process tree started here.
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 4173;
const URL = `http://${HOST}:${PORT}`;
const WAIT_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 250;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const viteEntry = path.join(appRoot, "node_modules", "vite", "bin", "vite.js");
const playwrightEntry = path.join(
  appRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);

let viteProcess;
let playwrightProcess;
let shuttingDown = false;

function isReachable() {
  return new Promise((resolve) => {
    const request = http.get(URL, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => resolve(false));
  });
}

async function waitForServer() {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isReachable()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for ${URL}`);
}

function killProcessTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // The process may already be gone.
    }
  }
}

async function cleanup() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  killProcessTree(playwrightProcess);
  killProcessTree(viteProcess);
}

function runProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: appRoot,
    env: process.env,
    shell: false,
    stdio: "inherit",
    detached: process.platform !== "win32",
    ...options,
  });
}

function signalExitCode(signal) {
  if (signal === "SIGINT") {
    return 130;
  }

  if (signal === "SIGTERM") {
    return 143;
  }

  return 1;
}

async function main() {
  if (await isReachable()) {
    console.error(`${URL} is already reachable; refusing to own an existing server.`);
    process.exit(1);
  }

  viteProcess = runProcess(process.execPath, [
    viteEntry,
    "--host",
    HOST,
    "--port",
    String(PORT),
  ]);

  try {
    await waitForServer();

    playwrightProcess = runProcess(
      process.execPath,
      [playwrightEntry, "test", ...process.argv.slice(2)],
      {
        env: {
          ...process.env,
          FAIRWAYD_E2E_EXTERNAL_SERVER: "1",
        },
      },
    );

    const exitCode = await new Promise((resolve) => {
      playwrightProcess.once("exit", (code, signal) => {
        resolve(code ?? signalExitCode(signal));
      });
    });

    await cleanup();
    process.exit(exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await cleanup();
    process.exit(1);
  }
}

process.once("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});

process.once("SIGTERM", async () => {
  await cleanup();
  process.exit(143);
});

main();
