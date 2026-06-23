import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFixturePath = path.resolve(
  __dirname,
  "../e2e/fixtures/course-fixtures.json",
);

const countryBounds = {
  TH: { lat: [5, 21], lon: [97, 106] },
  AE: { lat: [22, 27], lon: [51, 57] },
  TR: { lat: [35, 43], lon: [25, 45] },
  PT: { lat: [32, 43], lon: [-10, -6] },
  ES: { lat: [27, 44], lon: [-19, 5] },
  ZA: { lat: [-35, -22], lon: [16, 33] },
  US: { lat: [18, 72], lon: [-180, -65] },
};

function readFixtureCourses(fixturePath) {
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return Object.values(raw.criticalCoursesByCountry ?? {}).flat();
}

async function readApiCourses(apiBase) {
  const url = `${apiBase.replace(/\/$/, "")}/courses`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}

function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else {
      args.set(key, "true");
    }
  }

  return args;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function courseLabel(course) {
  return `${course.country ?? "??"} / ${course.name ?? course.id ?? "Unnamed course"}`;
}

function inspectCourses(courses) {
  const missingCoordinates = [];
  const zeroCoordinates = [];
  const outOfBounds = [];
  const duplicates = new Map();

  for (const course of courses) {
    const lat = numberOrNull(course.lat ?? course.latitude);
    const lon = numberOrNull(course.lon ?? course.lng ?? course.longitude);

    if (lat === null || lon === null) {
      missingCoordinates.push(course);
      continue;
    }

    if (lat === 0 && lon === 0) {
      zeroCoordinates.push(course);
    }

    const country = String(course.country ?? course.countryCode ?? "").toUpperCase();
    const bounds = countryBounds[country];

    if (
      bounds &&
      (lat < bounds.lat[0] ||
        lat > bounds.lat[1] ||
        lon < bounds.lon[0] ||
        lon > bounds.lon[1])
    ) {
      outOfBounds.push({ course, lat, lon, bounds });
    }

    const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    const existing = duplicates.get(key) ?? [];
    existing.push(course);
    duplicates.set(key, existing);
  }

  const duplicateExactCoordinates = [...duplicates.entries()].filter(
    ([, groupedCourses]) => groupedCourses.length > 1,
  );

  return {
    total: courses.length,
    missingCoordinates,
    zeroCoordinates,
    outOfBounds,
    duplicateExactCoordinates,
  };
}

function printSection(title, rows, formatter) {
  console.log(`\n${title}: ${rows.length}`);
  for (const row of rows) {
    console.log(`- ${formatter(row)}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const apiBase = args.get("api-base") || process.env.FAIRWAYD_API_BASE_URL;
const fixturePath = path.resolve(args.get("fixture") || defaultFixturePath);
const strict = args.get("strict") === "true";

const courses = apiBase
  ? await readApiCourses(apiBase)
  : readFixtureCourses(fixturePath);
const report = inspectCourses(courses);

console.log("Fairwayd course coordinate sanity report");
console.log(`Source: ${apiBase ? apiBase : fixturePath}`);
console.log(`Courses checked: ${report.total}`);

printSection("Missing lat/lng", report.missingCoordinates, courseLabel);
printSection("0/0 coordinates", report.zeroCoordinates, courseLabel);
printSection("Outside broad country bounds", report.outOfBounds, (entry) => {
  return `${courseLabel(entry.course)} at ${entry.lat},${entry.lon}`;
});
printSection(
  "Duplicate exact coordinates",
  report.duplicateExactCoordinates,
  ([coordinate, groupedCourses]) =>
    `${coordinate}: ${groupedCourses.map(courseLabel).join("; ")}`,
);

const criticalErrorCount =
  report.missingCoordinates.length + report.zeroCoordinates.length;

if (criticalErrorCount > 0 && strict) {
  console.error(`\nCritical coordinate errors found: ${criticalErrorCount}`);
  process.exitCode = 1;
}
