import { defineConfig } from 'prisma/config';

const url = process.env.NEON_DATABASE_URL;
if (!url) {
  throw new Error('NEON_DATABASE_URL not set');
}

export default defineConfig({
  schema: 'apps/api/prisma/schema.prisma',
  migrations: { path: 'apps/api/prisma/migrations' },
  datasource: { url },
});
