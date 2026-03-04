const DEFAULT_API_PORT = 3000;

const base =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`;

export const API_BASE = base.endsWith("/api") ? base : `${base}/api`;
