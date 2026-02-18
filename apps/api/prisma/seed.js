const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
      update: c,
      create: c,
    });
  }

  const count = await prisma.course.count();
  console.log('Seed complete. Course count:', count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
