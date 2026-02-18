import { defineConfig } from 'prisma/config';
import path from 'node:path';

const isProdLike = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';

const url = isProdLike
  ? process.env.NEON_DATABASE_URL
  : process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    isProdLike
      ? 'NEON_DATABASE_URL not set (required in production)'
      : 'DATABASE_URL not set (required in local dev)',
  );
}

export default defineConfig({
  schema: path.resolve(process.cwd(), 'prisma/schema.prisma'),
  migrations: {
    path: path.resolve(process.cwd(), 'prisma/migrations'),
    seed: 'node prisma/seed.cjs',
  },
  datasource: { url },
});
