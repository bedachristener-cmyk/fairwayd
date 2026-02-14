import { defineConfig } from 'prisma/config';

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'Database URL not set (NEON_DATABASE_URL or DATABASE_URL missing)',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url,
  },
});
