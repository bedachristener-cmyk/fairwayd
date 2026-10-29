export const AUTH_RATE_LIMITS = {
  login: { limit: 10, ttl: 60_000 },
  emailSend: { limit: 5, ttl: 15 * 60_000 },
  register: { limit: 5, ttl: 10 * 60_000 },
  verify: { limit: 10, ttl: 10 * 60_000 },
  dev: { limit: 20, ttl: 60_000 },
};
