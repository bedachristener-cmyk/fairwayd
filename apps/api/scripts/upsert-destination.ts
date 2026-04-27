import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const databaseUrlSource = process.env.NEON_DATABASE_URL
  ? 'NEON_DATABASE_URL'
  : 'DATABASE_URL';

if (!connectionString) {
  console.error('NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env');
  process.exit(1);
}

const activeConnectionString = connectionString;

function describeDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//***:***@${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}

function databaseHostAndName(value: string): { host: string; database: string } {
  try {
    const url = new URL(value);
    return {
      host: url.hostname || '<unknown>',
      database: url.pathname.replace(/^\//, '') || '<unknown>',
    };
  } catch {
    return { host: '<unknown>', database: '<unknown>' };
  }
}

const adapter = new PrismaPg({ connectionString: activeConnectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const code = (process.argv[2] || '').trim().toUpperCase();
  const name = (process.argv[3] || '').trim();
  const slug = (process.argv[4] || '').trim();

  if (!code || !name || !slug) {
    console.error(
      'Usage: npx ts-node scripts/upsert-destination.ts <code> <name> <slug>',
    );
    process.exit(1);
  }

  const db = databaseHostAndName(activeConnectionString);
  console.log(`Database URL source: ${databaseUrlSource}`);
  console.log(`Database: host=${db.host} db=${db.database}`);
  console.log(`Database URL: ${describeDatabaseUrl(activeConnectionString)}`);

  const existing = await prisma.destination.findUnique({
    where: { code },
    select: { id: true },
  });

  const destination = await prisma.destination.upsert({
    where: { code },
    create: {
      code,
      name,
      slug,
      isActive: true,
    },
    update: {
      name,
      slug,
      isActive: true,
    },
    select: {
      code: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  console.log(`Destination ${existing ? 'updated' : 'created'}.`);
  console.log(
    `code=${destination.code} name=${destination.name} slug=${destination.slug} active=${destination.isActive}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
