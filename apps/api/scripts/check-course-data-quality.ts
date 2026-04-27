import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

type CsvRow = Record<string, string>;

type Issue = {
  country: string;
  name: string;
  city: string;
  region: string;
  lat: string;
  lon: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  suggested_action: string;
};

type IssueDetails = Pick<Issue, 'reason' | 'severity' | 'suggested_action'>;

type Bounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const REPORT_COLUMNS = [
  'country',
  'name',
  'city',
  'region',
  'lat',
  'lon',
  'reason',
  'severity',
  'suggested_action',
] as const;

const COUNTRY_BOUNDS: Record<string, Bounds[]> = {
  AT: [{ minLat: 46.3, maxLat: 49.2, minLon: 9.4, maxLon: 17.2 }],
  CH: [{ minLat: 45.7, maxLat: 47.9, minLon: 5.8, maxLon: 10.6 }],
  DE: [{ minLat: 47.2, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 }],
  ES: [{ minLat: 27.5, maxLat: 43.9, minLon: -18.3, maxLon: 4.5 }],
  FR: [
    { minLat: 41.0, maxLat: 51.3, minLon: -5.5, maxLon: 9.8 },
    { minLat: 15.7, maxLat: 16.6, minLon: -61.9, maxLon: -61.0 },
    { minLat: 14.3, maxLat: 14.9, minLon: -61.3, maxLon: -60.8 },
    { minLat: -21.5, maxLat: -20.8, minLon: 55.1, maxLon: 55.9 },
  ],
  IT: [{ minLat: 35.3, maxLat: 47.3, minLon: 6.4, maxLon: 18.7 }],
  JP: [{ minLat: 24.0, maxLat: 46.0, minLon: 122.0, maxLon: 146.5 }],
  PT: [{ minLat: 32.2, maxLat: 42.2, minLon: -31.5, maxLon: -6.0 }],
  TH: [{ minLat: 5.5, maxLat: 20.6, minLon: 97.3, maxLon: 105.8 }],
  VN: [{ minLat: 8.0, maxLat: 23.5, minLon: 102.0, maxLon: 110.0 }],
};

const VALID_ACCESS = new Set([
  '',
  'PUBLIC',
  'PRIVATE',
  'RESORT',
  'MUNICIPAL',
  'SEMI_PRIVATE',
]);

const VALID_HOLES = new Set([
  '6',
  '9',
  '12',
  '18',
  '27',
  '36',
  '45',
  '54',
  '72',
  '18+5',
  '18+6',
  '18+7',
  '18+9',
  '18+18',
  '18+9+6',
  '18+9+9',
  '18+9+12',
  '18+18+6',
  '18+18+9',
  '27+9',
  '36+9',
  'Practice',
]);

function norm(value: unknown): string {
  return String(value ?? '').trim();
}

function normKey(value: unknown): string {
  return norm(value).toLowerCase().replace(/\s+/g, ' ');
}

function toFloat(value: unknown): number | null {
  const raw = norm(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function metersBetween(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const earthM = 6_371_000;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lonB - lonA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthM * Math.asin(Math.sqrt(a));
}

function isInsideAnyBounds(lat: number, lon: number, bounds: Bounds[]) {
  return bounds.some(
    (box) =>
      lat >= box.minLat &&
      lat <= box.maxLat &&
      lon >= box.minLon &&
      lon <= box.maxLon,
  );
}

function addIssue(issues: Issue[], row: CsvRow, issue: IssueDetails) {
  issues.push({
    country: norm(row.country),
    name: norm(row.name),
    city: norm(row.city),
    region: norm(row.region),
    lat: norm(row.lat),
    lon: norm(row.lon),
    ...issue,
  });
}

function coordBucket(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function websiteKey(row: CsvRow): string {
  return norm(row.website)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npx ts-node scripts/check-course-data-quality.ts <courses.csv>');
    process.exit(1);
  }

  const csvPath = path.resolve(fileArg);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const outputDir = path.dirname(csvPath);
  const reportPath = path.join(outputDir, 'course-quality-report.csv');
  const summaryPath = path.join(outputDir, 'course-quality-summary.txt');

  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CsvRow[];

  const issues: Issue[] = [];
  const byNameCountryRegion = new Map<string, CsvRow[]>();
  const byCoordBucket = new Map<string, CsvRow[]>();
  const byWebsite = new Map<string, CsvRow[]>();

  for (const row of rows) {
    const country = norm(row.country).toUpperCase();
    const name = norm(row.name);
    const region = norm(row.region);
    const lat = toFloat(row.lat);
    const lon = toFloat(row.lon);
    const holes = norm(row.holes);
    const access = norm(row.access).toUpperCase();

    if (lat === null || lon === null) {
      addIssue(issues, row, {
        reason: 'missing or non-numeric lat/lon',
        severity: 'high',
        suggested_action: 'Add verified decimal latitude and longitude before import.',
      });
    } else {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        addIssue(issues, row, {
          reason: 'lat/lon outside valid coordinate range',
          severity: 'high',
          suggested_action: 'Correct swapped or malformed coordinates.',
        });
      }

      const bounds = COUNTRY_BOUNDS[country];
      if (bounds && !isInsideAnyBounds(lat, lon, bounds)) {
        addIssue(issues, row, {
          reason: `coordinates outside plausible ${country} bounding box`,
          severity: 'high',
          suggested_action: 'Verify country code and coordinates against the course location.',
        });
      }

      const bucket = coordBucket(lat, lon);
      const coordRows = byCoordBucket.get(bucket) ?? [];
      coordRows.push(row);
      byCoordBucket.set(bucket, coordRows);
    }

    if (!VALID_HOLES.has(holes)) {
      addIssue(issues, row, {
        reason: `invalid holes value "${holes}"`,
        severity: holes ? 'medium' : 'low',
        suggested_action: 'Use one numeric value: 9, 18, 27, or 36.',
      });
    }

    if (!VALID_ACCESS.has(access)) {
      addIssue(issues, row, {
        reason: `invalid access value "${norm(row.access)}"`,
        severity: 'medium',
        suggested_action: 'Use Public, Private, Resort, Municipal, or Semi_Private.',
      });
    }

    const nameKey = `${country}|${normKey(region)}|${normKey(name)}`;
    const nameRows = byNameCountryRegion.get(nameKey) ?? [];
    nameRows.push(row);
    byNameCountryRegion.set(nameKey, nameRows);

    const site = websiteKey(row);
    if (site) {
      const siteRows = byWebsite.get(site) ?? [];
      siteRows.push(row);
      byWebsite.set(site, siteRows);
    }
  }

  for (const rowsForName of byNameCountryRegion.values()) {
    if (rowsForName.length < 2) continue;
    for (const row of rowsForName) {
      addIssue(issues, row, {
        reason: 'duplicate course name within same country/region',
        severity: 'medium',
        suggested_action: 'Review whether these rows are duplicate records or distinct course facilities.',
      });
    }
  }

  for (const rowsForCoord of byCoordBucket.values()) {
    if (rowsForCoord.length < 2) continue;

    for (let i = 0; i < rowsForCoord.length; i++) {
      for (let j = i + 1; j < rowsForCoord.length; j++) {
        const a = rowsForCoord[i];
        const b = rowsForCoord[j];
        const aLat = toFloat(a.lat);
        const aLon = toFloat(a.lon);
        const bLat = toFloat(b.lat);
        const bLon = toFloat(b.lon);
        if (aLat === null || aLon === null || bLat === null || bLon === null) {
          continue;
        }

        const distanceM = metersBetween(aLat, aLon, bLat, bLon);
        if (distanceM > 25) continue;

        const sameName = normKey(a.name) === normKey(b.name);
        const reason = sameName
          ? 'identical or near-identical duplicate coordinates'
          : `near-identical coordinates shared with "${norm(b.name)}"`;

        addIssue(issues, a, {
          reason,
          severity: sameName ? 'medium' : 'low',
          suggested_action: 'Review map position and merge only if these are the same course.',
        });
        addIssue(issues, b, {
          reason: sameName
            ? 'identical or near-identical duplicate coordinates'
            : `near-identical coordinates shared with "${norm(a.name)}"`,
          severity: sameName ? 'medium' : 'low',
          suggested_action: 'Review map position and merge only if these are the same course.',
        });
      }
    }
  }

  for (const rowsForWebsite of byWebsite.values()) {
    if (rowsForWebsite.length < 2) continue;

    const distinctNames = new Set(rowsForWebsite.map((row) => normKey(row.name)));
    const distinctCoords = new Set(
      rowsForWebsite.map((row) => `${norm(row.lat)},${norm(row.lon)}`),
    );

    if (distinctNames.size < 2 || distinctCoords.size < 2) continue;

    for (const row of rowsForWebsite) {
      addIssue(issues, row, {
        reason: 'same website used by multiple names/coordinates',
        severity: 'low',
        suggested_action: 'Check whether this is a multi-course operator, duplicate, or wrong website.',
      });
    }
  }

  issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return (
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.country.localeCompare(b.country) ||
      a.region.localeCompare(b.region) ||
      a.name.localeCompare(b.name) ||
      a.reason.localeCompare(b.reason)
    );
  });

  const report = [
    REPORT_COLUMNS.join(','),
    ...issues.map((issue) =>
      REPORT_COLUMNS.map((column) => csvEscape(issue[column])).join(','),
    ),
  ].join('\n');

  const severityCounts = issues.reduce(
    (acc, issue) => {
      acc[issue.severity]++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const reasonCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const issue of issues) {
    reasonCounts.set(issue.reason, (reasonCounts.get(issue.reason) ?? 0) + 1);
    countryCounts.set(issue.country, (countryCounts.get(issue.country) ?? 0) + 1);
  }

  const summaryLines = [
    'Fairwayd course data quality summary',
    `CSV path: ${csvPath}`,
    `Rows parsed: ${rows.length}`,
    `Issues found: ${issues.length}`,
    `High severity: ${severityCounts.high}`,
    `Medium severity: ${severityCounts.medium}`,
    `Low severity: ${severityCounts.low}`,
    '',
    'Issues by country:',
    ...[...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([country, count]) => `  ${country || '<missing>'}: ${count}`),
    '',
    'Issues by reason:',
    ...[...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([reason, count]) => `  ${count}: ${reason}`),
    '',
    'Notes:',
    '  Bounding-box checks are country-level plausibility checks, not authoritative geocoding.',
    '  City/region distance checks require a trusted geocoding source and are intentionally not guessed here.',
  ];

  fs.writeFileSync(reportPath, `${report}\n`, 'utf8');
  fs.writeFileSync(summaryPath, `${summaryLines.join('\n')}\n`, 'utf8');

  console.log(`Rows parsed: ${rows.length}`);
  console.log(`Issues found: ${issues.length}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Summary: ${summaryPath}`);
}

main();
