// Prisma schema diffs omit SQL CHECK constraints. Preserve the original
// migration's guards in the isolated CI database before testing new migrations.
const fs = require('node:fs');
const migration = fs.readFileSync('prisma/migrations/20261028180000_content_moderation/migration.sql', 'utf8');
const checks = migration.split('\n').map(line => line.trim().replace(/,$/, ''))
  .filter(line => line.startsWith('CONSTRAINT "ContentModerationCase_') && line.includes(' CHECK '));
if (checks.length !== 2) throw new Error('Review the original moderation CHECK constraints before changing CI setup.');
fs.writeFileSync('/tmp/moderation-checks.sql', checks.map(check => `ALTER TABLE "ContentModerationCase" ADD ${check};`).join('\n'));
