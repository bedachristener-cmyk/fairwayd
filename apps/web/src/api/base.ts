const DEFAULT_API_PORT = 3000;

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`;
