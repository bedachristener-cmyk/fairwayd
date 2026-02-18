import { defineConfig } from 'prisma/config';
import path from 'node:path';

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'Database URL not set. Set NEON_DATABASE_URL (Neon stage/prod) or DATABASE_URL (local dev).',
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
