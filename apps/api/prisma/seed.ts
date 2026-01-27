import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  console.log("✅ Seeded demo courses");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
