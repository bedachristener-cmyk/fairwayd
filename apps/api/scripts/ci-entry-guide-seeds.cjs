// A schema-derived baseline contains tables but no migration seed data.
const fs = require('node:fs');
const sql = fs.readFileSync('prisma/migrations/20261030100000_country_entry_guides/migration.sql', 'utf8');
const rows = sql.split('\n').filter(line => line.startsWith('INSERT INTO "CountryEntryGuide"'));
if (rows.length !== 3) throw new Error('Expected the three reviewed country seeds');
fs.writeFileSync('/tmp/ci-entry-guides-seeds.sql', rows.map(line => line.replace('"published", "entries") VALUES', '"published", "entries", "updatedAt") VALUES').replace('::jsonb);', '::jsonb, CURRENT_TIMESTAMP);').replace(/;$/, ' ON CONFLICT ("countryCode") DO NOTHING;')).join('\n'));
