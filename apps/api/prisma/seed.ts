import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedCourse = {
  name: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country: string;
  lat: number;
  lon: number;
  holes?: number;
  par?: number;
  website?: string;
  phone?: string;
  description?: string;
  source?: string;
  verified?: boolean;
  active?: boolean;
};

const courses: SeedCourse[] = [
  {
    name: 'Golfclub Basel',
    city: 'Basel',
    postalCode: '4052',
    region: 'BS',
    country: 'CH',
    lat: 47.5596,
    lon: 7.5886,
    holes: 18,
    par: 72,
    website: 'https://www.golfbasel.ch',
    source: 'seed',
    verified: true,
    active: true,
  },
  {
    name: 'Golfclub Zürichsee',
    city: 'Nuolen',
    region: 'SZ',
    country: 'CH',
    lat: 47.1729,
    lon: 8.8675,
    holes: 18,
    par: 72,
    source: 'seed',
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
    active: true,
  },
  {
    name: 'Golf Club Lugano',
    city: 'Magliaso',
    region: 'TI',
    country: 'CH',
    lat: 45.9749,
    lon: 8.8877,
    holes: 18,
    par: 72,
    source: 'seed',
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
    active: true,
  },
  {
    name: 'Golf Club Crans-sur-Sierre',
    city: 'Crans-Montana',
    region: 'VS',
    country: 'CH',
    lat: 46.3131,
    lon: 7.475,
    holes: 18,
    par: 72,
    source: 'seed',
    active: true,
  },
  {
    name: 'Golfclub Interlaken-Unterseen',
    city: 'Unterseen',
    region: 'BE',
    country: 'CH',
    lat: 46.685,
    lon: 7.8462,
    holes: 18,
    par: 72,
    source: 'seed',
    active: true,
  },
  {
    name: 'Golfclub St. Apollinaire',
    city: 'Binningen',
    region: 'BL',
    country: 'CH',
    lat: 47.5454,
    lon: 7.5504,
    holes: 18,
    par: 72,
    source: 'seed',
    active: true,
  },
];

async function main() {
  // Idempotent: upsert via unique import key (country+name+lat+lon)
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
        postalCode: c.postalCode ?? null,
        region: c.region ?? null,
        holes: c.holes ?? null,
        par: c.par ?? null,
        website: c.website ?? null,
        phone: c.phone ?? null,
        description: c.description ?? null,
        source: c.source ?? 'seed',
        verified: c.verified ?? false,
        active: c.active ?? true,
      },
      create: {
        name: c.name,
        city: c.city ?? null,
        postalCode: c.postalCode ?? null,
        region: c.region ?? null,
        country: c.country,
        lat: c.lat,
        lon: c.lon,
        holes: c.holes ?? null,
        par: c.par ?? null,
        website: c.website ?? null,
        phone: c.phone ?? null,
        description: c.description ?? null,
        source: c.source ?? 'seed',
        verified: c.verified ?? false,
        active: c.active ?? true,
      },
    });
  }

  const count = await prisma.course.count();
  console.log(`✅ Seeded courses. Total courses: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
