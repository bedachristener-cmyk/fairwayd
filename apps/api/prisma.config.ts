import { defineConfig } from 'prisma/config';
import path from 'node:path';

const url = process.env.NEON_DATABASE_URL;
if (!url) {
  throw new Error('NEON_DATABASE_URL not set');
}

export default defineConfig({
  schema: path.resolve(process.cwd(), 'prisma/schema.prisma'),
  migrations: {
    path: path.resolve(process.cwd(), 'prisma/migrations'),
  },
  datasource: { url },
});
