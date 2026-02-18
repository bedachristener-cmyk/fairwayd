const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'Database URL not set. Set NEON_DATABASE_URL (Neon stage/prod) or DATABASE_URL (local dev).',
  );
}

const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);

// IMPORTANT: driver adapter mode requires adapter or accelerateUrl
const prisma = new PrismaClient({ adapter });

async function main() {
  const courses = [
    {
      name: 'Golfclub Basel',
      city: 'Basel',
      region: 'BS',
      country: 'CH',
      lat: 47.5596,
      lon: 7.5886,
      holes: 18,
      par: 72,
      source: 'seed',
      verified: true,
      active: true,
    },
    {
      name: 'Golf Club Bad Ragaz',
      city: 'Bad Ragaz',
      region: 'SG',
      country: 'CH',
      lat: 46.9986,
      lon: 9.505,
      holes: 18,
      par: 72,
      source: 'seed',
      verified: true,
      active: true,
    },
    {
      name: 'Golf Sempach',
      city: 'Sempach',
      region: 'LU',
      country: 'CH',
      lat: 47.1324,
      lon: 8.2002,
      holes: 18,
      par: 72,
      source: 'seed',
      verified: true,
      active: true,
    },
    {
      name: 'Golfclub Bern',
      city: 'Moosseedorf',
      region: 'BE',
      country: 'CH',
      lat: 47.0164,
      lon: 7.4806,
      holes: 18,
      par: 72,
      source: 'seed',
      verified: true,
      active: true,
    },
    {
      name: 'Golf Club Lausanne',
      city: 'Lausanne',
      region: 'VD',
      country: 'CH',
      lat: 46.5197,
      lon: 6.6323,
      holes: 18,
      par: 72,
      source: 'seed',
      verified: true,
      active: true,
    },
  ];

  for (const c of courses) {
    await prisma.course.upsert({
      where: {
        course_unique_import_key: {
          country: c.country,
          name: c.name,
          lat: c.lat,
          lon: c.lon,
        },
      },
      update: {
        city: c.city ?? null,
        region: c.region ?? null,
        holes: c.holes ?? null,
        par: c.par ?? null,
        source: c.source ?? 'seed',
        verified: c.verified ?? false,
        active: c.active ?? true,
      },
      create: {
        name: c.name,
        city: c.city ?? null,
        region: c.region ?? null,
        country: c.country,
        lat: c.lat,
        lon: c.lon,
        holes: c.holes ?? null,
        par: c.par ?? null,
        source: c.source ?? 'seed',
        verified: c.verified ?? false,
        active: c.active ?? true,
      },
    });
  }

  const count = await prisma.course.count();
  console.log(`✅ Seed done. Courses in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
