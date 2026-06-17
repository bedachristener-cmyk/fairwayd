import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const destinations = [
    { code: "TH", name: "Thailand", slug: "thailand" },
    { code: "VN", name: "Vietnam", slug: "vietnam" },
    { code: "PT", name: "Portugal", slug: "portugal" },
    { code: "ES", name: "Spain", slug: "spain" },
    { code: "TR", name: "Turkey", slug: "turkey" },
    { code: "AE", name: "United Arab Emirates", slug: "united-arab-emirates" },
    { code: "CH", name: "Switzerland", slug: "switzerland" },
    { code: "DE", name: "Germany", slug: "germany" },
    { code: "AT", name: "Austria", slug: "austria" },
    { code: "FR", name: "France", slug: "france" },
    { code: "IT", name: "Italy", slug: "italy" },
    { code: "JP", name: "Japan", slug: "japan" },
    { code: "PH", name: "Philippines", slug: "philippines" },
    { code: "US", name: "United States", slug: "united-states" },
    { code: "ZA", name: "South Africa", slug: "south-africa" },
  ];

  for (const item of destinations) {
    await prisma.destination.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        slug: item.slug,
        isActive: true,
      },
      create: item,
    });
  }

  await prisma.course.createMany({
    data: [
      {
        name: "St Andrews Links (Old Course)",
        country: "UK",
        region: "Scotland",
        city: "St Andrews",
        postalCode: "KY16",
        lat: 56.3432,
        lon: -2.8037,
      },
      {
        name: "Pebble Beach Golf Links",
        country: "US",
        region: "California",
        city: "Pebble Beach",
        postalCode: "93953",
        lat: 36.5687,
        lon: -121.9486,
      },
      {
        name: "Golf Club Crans-sur-Sierre",
        country: "CH",
        region: "Valais",
        city: "Crans-Montana",
        postalCode: "3963",
        lat: 46.3075,
        lon: 7.4789,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seeded destinations and demo courses");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
