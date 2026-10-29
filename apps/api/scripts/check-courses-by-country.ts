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
  const country = (process.argv[2] || '').trim().toUpperCase();

  if (!country) {
    console.error('Usage: npx ts-node scripts/check-courses-by-country.ts <country>');
    process.exit(1);
  }

  const db = databaseHostAndName(activeConnectionString);
  console.log(`Database URL source: ${databaseUrlSource}`);
  console.log(`Database: host=${db.host} db=${db.database}`);
  console.log(`Database URL: ${describeDatabaseUrl(activeConnectionString)}`);
  console.log(`Country: ${country}`);

  const count = await prisma.course.count({
    where: {
      country,
      active: true,
    },
  });

  const courses = await prisma.course.findMany({
    where: {
      country,
      active: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 5,
    select: {
      id: true,
      name: true,
      city: true,
      region: true,
      country: true,
      lat: true,
      lon: true,
      holes: true,
      access: true,
      active: true,
    },
  });

  console.log(`Active courses: ${count}`);
  console.log('First 5 courses:');
  for (const course of courses) {
    console.log(
      `- ${course.name} (${course.country}${course.region ? `, ${course.region}` : ''}) lat=${course.lat} lon=${course.lon}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
