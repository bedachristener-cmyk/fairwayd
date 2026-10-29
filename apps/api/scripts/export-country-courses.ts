import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function googleSearchUrl(course: {
  name: string;
  city: string | null;
  region: string | null;
}) {
  const query = [course.name, course.city, course.region, 'golf course']
    .filter(Boolean)
    .join(' ');

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function googleCoordUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lon}`,
  )}`;
}

async function main() {
  const country = (process.argv[2] || '').trim().toUpperCase();

  if (!country) {
    console.error(
      'Usage: npx ts-node scripts/export-country-courses.ts <countryCode>',
    );
    process.exit(1);
  }

  const outputPath = path.resolve(
    `data/courses/${country.toLowerCase()}.csv`,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const courses = await prisma.course.findMany({
    where: {
      country,
      active: true,
    },
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
    select: {
      id: true,
      country: true,
      name: true,
      city: true,
      region: true,
      website: true,
      lat: true,
      lon: true,
    },
  });

  const header = [
    'id',
    'country',
    'name',
    'city',
    'region',
    'website',
    'lat',
    'lon',
    'googleSearchUrl',
    'googleCoordUrl',
  ];

  const lines = [
    header.join(','),
    ...courses.map((course) =>
      [
        course.id,
        course.country,
        course.name,
        course.city,
        course.region,
        course.website,
        course.lat,
        course.lon,
        googleSearchUrl(course),
        googleCoordUrl(course.lat, course.lon),
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf-8');

  console.log(`Country: ${country}`);
  console.log(`Exported: ${courses.length}`);
  console.log(`Output: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
