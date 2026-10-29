const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.course.findMany({
    where: {
      name: {
        contains: "Ribagolfe",
        mode: "insensitive",
      },
    },
    select: {
      name: true,
      lat: true,
      lon: true,
    },
  });

  console.log(rows);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });