import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  courseDiscoveryCountryConfig,
  supportedCourseDiscoveryCountries,
} from '../src/courses/course-discovery-country';

const country = String(process.argv[2] ?? '').trim().toUpperCase();
const confirmed = process.argv.includes('--confirm-google-places-requests');
const config = courseDiscoveryCountryConfig(country);

if (!config || !confirmed) {
  console.error(
    'Usage: npx ts-node scripts/prepare-course-country-review.ts <countryCode> --confirm-google-places-requests',
  );
  console.error(
    `Supported countries: ${supportedCourseDiscoveryCountries().join(', ')}`,
  );
  process.exit(1);
}

const tsNodeBin = path.resolve('node_modules/ts-node/dist/bin.js');
if (!fs.existsSync(tsNodeBin)) {
  console.error(`ts-node executable not found: ${tsNodeBin}`);
  process.exit(1);
}

type Step = {
  label: string;
  script: string;
  args: string[];
};

const steps: Step[] = [
  {
    label: 'coordinate audit',
    script: 'audit-course-coordinates.ts',
    args: ['--country', country],
  },
  {
    label: 'nationwide Google discovery',
    script: 'google-places-course-discovery.ts',
    args: [country, '--dry-run', '--confirm-google-places-requests'],
  },
  {
    label: 'existing course candidate review',
    script: 'google-places-course-review.ts',
    args: [country, 'all', '--dry-run', '--confirm-google-places-requests'],
  },
  {
    label: 'discovered course detail review',
    script: 'google-places-course-inventory-review.ts',
    args: [country, '--dry-run', '--confirm-google-places-requests'],
  },
];

const countryLower = country.toLowerCase();
const knownCourseScript = `google-places-${countryLower}-known-course-review.ts`;
if (fs.existsSync(path.resolve('scripts', knownCourseScript))) {
  steps.splice(3, 0, {
    label: 'official known-course review',
    script: knownCourseScript,
    args: ['--dry-run', '--confirm-google-places-requests'],
  });
}

console.log(
  `Preparing consolidated course review: country=${country} steps=${steps.length}`,
);
console.log('Database writes: disabled');

for (let index = 0; index < steps.length; index++) {
  const step = steps[index];
  const scriptPath = path.resolve('scripts', step.script);
  console.log(`\n[${index + 1}/${steps.length}] ${step.label}`);

  const result = spawnSync(process.execPath, [tsNodeBin, scriptPath, ...step.args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Country review preparation stopped during "${step.label}" with exit code ${result.status ?? 'unknown'}`,
    );
  }
}

const outputPaths = [
  path.resolve(
    `course-audits/course-coordinate-summary-${countryLower}.json`,
  ),
  path.resolve(
    `course-audits/course-coordinate-details-${countryLower}.csv`,
  ),
  path.resolve(
    `course-audits/${countryLower}-google-places-discovery.csv`,
  ),
  path.resolve(
    `course-audits/${countryLower}-google-places-candidates.csv`,
  ),
  path.resolve(
    `course-audits/${countryLower}-course-inventory-google-details.csv`,
  ),
];

if (fs.existsSync(path.resolve('scripts', knownCourseScript))) {
  outputPaths.splice(
    4,
    0,
    path.resolve(
      `course-audits/${countryLower}-known-course-google-candidates.csv`,
    ),
  );
}

const missingOutputs = outputPaths.filter(
  (outputPath) => !fs.existsSync(outputPath),
);
if (missingOutputs.length > 0) {
  throw new Error(
    `Review preparation finished with missing output(s): ${missingOutputs.join(', ')}`,
  );
}

const reviewBundlePath = path.resolve(
  `course-audits/${countryLower}-course-review-bundle.json`,
);
const reviewFiles = Object.fromEntries(
  outputPaths.map((outputPath) => [
    path.basename(outputPath),
    fs.readFileSync(outputPath, 'utf8'),
  ]),
);
fs.writeFileSync(
  reviewBundlePath,
  JSON.stringify(
    {
      country,
      generatedAt: new Date().toISOString(),
      files: reviewFiles,
    },
    null,
    2,
  ),
  'utf8',
);

console.log('\nPreparation complete.');
console.log(
  `Outputs: course-audits/course-coordinate-summary-${countryLower}.json`,
);
console.log(
  `         course-audits/course-coordinate-details-${countryLower}.csv`,
);
console.log(
  `         course-audits/${countryLower}-google-places-discovery.csv`,
);
console.log(
  `         course-audits/${countryLower}-google-places-candidates.csv`,
);
if (fs.existsSync(path.resolve('scripts', knownCourseScript))) {
  console.log(
    `         course-audits/${countryLower}-known-course-google-candidates.csv`,
  );
}
console.log(
  `         course-audits/${countryLower}-course-inventory-google-details.csv`,
);
console.log(`Review bundle: ${reviewBundlePath}`);
console.log('Database changes: 0');
