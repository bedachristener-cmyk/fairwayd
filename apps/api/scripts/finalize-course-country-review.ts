import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const country = String(process.argv[2] ?? '').trim().toUpperCase();
const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(
  '--confirm-reviewed-course-country-reconciliation',
);

if (!/^[A-Z]{2}$/.test(country)) {
  console.error(
    'Usage: npx ts-node scripts/finalize-course-country-review.ts <countryCode> [--apply --confirm-reviewed-course-country-reconciliation]',
  );
  process.exit(1);
}
if (apply && !confirmed) {
  console.error(
    '--apply requires --confirm-reviewed-course-country-reconciliation',
  );
  process.exit(1);
}
if (!apply && confirmed) {
  console.error(
    '--confirm-reviewed-course-country-reconciliation is only valid with --apply',
  );
  process.exit(1);
}

const countryLower = country.toLowerCase();
const tsNodeBin = path.resolve('node_modules/ts-node/dist/bin.js');
const reconciliationScript = path.resolve(
  'scripts',
  `apply-reviewed-${countryLower}-course-reconciliation.ts`,
);
const reconciliationSpec =
  `src/courses/reviewed-${countryLower}-course-reconciliation.spec.ts`;

for (const requiredPath of [tsNodeBin, reconciliationScript, path.resolve(reconciliationSpec)]) {
  if (!fs.existsSync(requiredPath)) {
    console.error(`Required reconciliation file not found: ${requiredPath}`);
    process.exit(1);
  }
}

type Command = {
  label: string;
  command: string;
  args: string[];
  requireNoChanges?: boolean;
};

const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) {
  console.error(
    'npm CLI path is unavailable. Run this workflow through npm/npx from the API workspace.',
  );
  process.exit(1);
}
const countryConfirmation =
  `--confirm-reviewed-${countryLower}-course-reconciliation`;

const commands: Command[] = [
  {
    label: 'API build',
    command: process.execPath,
    args: [npmCli, 'run', 'build'],
  },
  {
    label: 'reviewed reconciliation tests',
    command: process.execPath,
    args: [npmCli, 'test', '--', '--runInBand', reconciliationSpec],
  },
  {
    label: 'reconciliation dry-run',
    command: process.execPath,
    args: [tsNodeBin, reconciliationScript],
  },
];

if (apply) {
  commands.push(
    {
      label: 'reviewed reconciliation apply',
      command: process.execPath,
      args: [
        tsNodeBin,
        reconciliationScript,
        '--apply',
        countryConfirmation,
      ],
    },
    {
      label: 'post-apply idempotency verification',
      command: process.execPath,
      args: [tsNodeBin, reconciliationScript],
      requireNoChanges: true,
    },
  );
}

console.log(
  `Finalizing consolidated course review: country=${country} mode=${apply ? 'apply' : 'dry-run'} steps=${commands.length}`,
);

for (let index = 0; index < commands.length; index++) {
  const step = commands[index];
  console.log(`\n[${index + 1}/${commands.length}] ${step.label}`);

  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: step.requireNoChanges ? 'utf8' : undefined,
    stdio: step.requireNoChanges ? 'pipe' : 'inherit',
  });

  if (step.requireNoChanges) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Country review finalization stopped during "${step.label}" with exit code ${result.status ?? 'unknown'}`,
    );
  }
  if (
    step.requireNoChanges &&
    !String(result.stdout ?? '').includes('database_changes=0')
  ) {
    throw new Error(
      'Post-apply verification did not confirm database_changes=0',
    );
  }
}

console.log(
  `\nFinalization complete: country=${country} mode=${apply ? 'apply' : 'dry-run'}`,
);
