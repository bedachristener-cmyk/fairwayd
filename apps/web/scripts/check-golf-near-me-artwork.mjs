// Verify the six locally installed, AI-generated Golf Near Me category images.
// This is deliberately read-only. It prevents broken image paths and incorrect
// archive contents from silently going into the feature PR.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../public/golf-near-me/categories/', import.meta.url)));
const files = {
  'simulator.webp': 'c4ee7135a343f3dbbdb1b9ad5a60c5eb6559ee355b61e4aeade7ee425c2dfaa2',
  'course.webp': '383e9b2b2257a664c81944cdbff4eb81d0f71fa9471a38cc0ca47966b169ba8f',
  'range.webp': 'ab2b0dd5bc052a4ad0ebff72242d20b4f323f1f67b5ca8f6efcc0172c5dc2130',
  'academy.webp': '1b825731cdd9fb689c99519251e7cd3e18877b4fe4e6a1335a2ca91a03766627',
  'shop.webp': 'a44ed396be37139c828a854bd232106bfe041a718ce855aba95622f39395a4e1',
  'fitting.webp': '15536e5968f182faf839d3dda2ebe5700d3ad5c78a77ff9fb6ffc3371c3a9dd5',
};
let ok = true;
let bytes = 0;
for (const [name, expected] of Object.entries(files)) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) {
    console.error('MISSING: ' + name);
    ok = false;
    continue;
  }
  const body = fs.readFileSync(file);
  const validFormat = body.length > 20
    && body.subarray(0, 4).toString('ascii') === 'RIFF'
    && body.subarray(8, 12).toString('ascii') === 'WEBP';
  const digest = crypto.createHash('sha256').update(body).digest('hex');
  const matches = validFormat && digest === expected && body.length < 120_000;
  console.log((matches ? 'OK: ' : 'MISMATCH: ') + name + ' (' + body.length + ' bytes)');
  if (!matches) ok = false;
  bytes += body.length;
}
if (!ok) {
  console.error('Category art validation failed. Extract the supplied asset ZIP at the repository root.');
  process.exitCode = 1;
} else {
  console.log('PASS: Six optimized AI category images installed (' + bytes + ' bytes total).');
}
