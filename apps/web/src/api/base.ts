const DEFAULT_API_PORT = 3000;

function configuredApiBase() {
  return String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
}

function localApiBase() {
  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`;
}

const configuredBase = configuredApiBase();
const base = configuredBase || (import.meta.env.DEV ? localApiBase() : '');

if (!base) {
  throw new Error('VITE_API_BASE_URL is required for production builds');
}

export const API_BASE = base.endsWith("/api") ? base : `${base}/api`;
