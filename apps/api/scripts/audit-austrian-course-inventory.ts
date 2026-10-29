import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  matchAustrianCourseInventory,
  parseAustrianCourseInventoryHtml,
} from '../src/courses/austrian-course-inventory-audit';

const INVENTORY_URL =
  'https://www.golfcity.at/golfplaetze-oesterreich/';

const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'NEON_DATABASE_URL or DATABASE_URL is missing. Check apps/api/.env',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ['error'] });

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  console.log(`Read-only inventory audit: source=${INVENTORY_URL}`);

  const response = await fetch(INVENTORY_URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Fairwayd course inventory audit/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Inventory request failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const inventory = parseAustrianCourseInventoryHtml(await response.text());
  if (inventory.length < 120) {
    throw new Error(
      `Inventory parser returned only ${inventory.length} rows; expected at least 120. No report written.`,
    );
  }

  const activeCourses = await prisma.course.findMany({
    where: { country: 'AT', active: true },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  });

  const results = matchAustrianCourseInventory(inventory, activeCourses).sort(
    (left, right) =>
      left.status.localeCompare(right.status) ||
      left.inventory.name.localeCompare(right.inventory.name, 'de'),
  );

  const reviewCount = results.filter(
    (result) => result.status === 'REVIEW',
  ).length;
  const matchedCount = results.length - reviewCount;

  const header = [
    'status',
    'regionCode',
    'inventoryName',
    'address',
    'postalCode',
    'city',
    'courseDescription',
    'website',
    'matchedCourseId',
    'matchedCourseName',
    'matchedCourseCity',
    'nameSimilarity',
    'cityMatch',
    'reviewDecision',
    'reviewNotes',
  ];

  const rows = results.map((result) => [
    result.status,
    result.inventory.regionCode,
    result.inventory.name,
    result.inventory.address,
    result.inventory.postalCode,
    result.inventory.city,
    result.inventory.courseDescription,
    result.inventory.website,
    result.matchedCourse?.id,
    result.matchedCourse?.name,
    result.matchedCourse?.city,
    result.nameSimilarity.toFixed(3),
    result.cityMatch,
    '',
    '',
  ]);

  const outputDir = path.resolve('course-audits');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(
    outputDir,
    'at-directory-inventory-audit.csv',
  );
  fs.writeFileSync(
    outputPath,
    [header, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n') + '\n',
    'utf8',
  );

  console.log(
    `Summary: active_AT=${activeCourses.length} inventory=${inventory.length} matched=${matchedCount} review=${reviewCount}`,
  );
  console.log(`Output: ${outputPath}`);
  console.log('Database changes: 0');
}

main()
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
