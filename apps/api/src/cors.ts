function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function isTruthy(value: string | undefined, fallback = false) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

const allowedExactOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://localhost',
  'https://fairwayd.vercel.app',
  'https://fairwayd-git-stage-bedachristener-cmyks-projects.vercel.app',
  'https://www.fairwayd.golf',
  'https://fairwayd.golf',
]);

export function isCorsOriginAllowed(origin: string | undefined) {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedExactOrigins.has(normalizedOrigin)) return true;

  try {
    const host = new URL(normalizedOrigin).hostname;
    return (
      isTruthy(process.env.ALLOW_VERCEL_PREVIEWS, true) &&
      host.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}

export function shouldEnableSwagger() {
  return process.env.NODE_ENV !== 'production';
}
