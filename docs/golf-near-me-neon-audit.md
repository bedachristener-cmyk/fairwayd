# Fairwayd Golf Near Me – Neon / Railway migration baseline audit

**Audit date:** 2026-10-23. **Mode:** metadata reads and explicit SQL `SELECT` only; zero migrations, writes or deployments.

## Environment map

| Role | Provider | Name / ID | Host prefix |
|---|---|---|---|
| Railway API Stage service | Railway project `intuitive-eagerness` | `fairwayd-stage`, deployment source Git branch `stage` | Its `NEON_DATABASE_URL` variable exists, but Railway OAuth does not disclose its value |
| Neon Stage branch | Neon project `Fairwayd` (`billowing-breeze-32238900`) | `stage` / `br-broad-salad-ag6pnor0` | `ep-restless-wildflower-agf67w6m` |
| Isolated test branch | same Neon project | `br-rough-darkness-ag13g4d3` (created 2026-10-21, cloned from Stage) | `ep-summer-sound-aggo2eqy` |
| Neon production | same Neon project | `production` / `br-soft-cell-aga965p7` | `ep-lingering-pine-ag2rjgsv` |

The Railway Stage host prefix was obtained from an earlier verified Railway environment check; it **matches the Neon Stage branch endpoint**. Distinct host prefixes on the isolated test branch are **expected**. The connected Railway OAuth plugin returns names of variables only, so it has **not independently confirmed the database name inside the Railway connection URL**.

Note: Railway's environment is named `production`, but contains separate services `fairwayd-stage` and `fairwayd`. Do not mistake the Railway environment label for the application's Stage/Production service name.

## Read-only Postgres inspection

Both Neon Stage and the isolated test branch have two Postgres databases:

| Branch | Database | Completed migrations | Unresolved migration rows | Newer application schema |
|---|---|---:|---:|---|
| Stage | `neondb` | 13 | 0 | Missing `TripDocument` and `PostCollection` |
| Stage | `fairwayd_stage` | **59** | **0** | Has `Course`, `TripDocument`, `PostCollection` |
| Isolated test | `neondb` | 13 | 0 | Missing `TripDocument` and `PostCollection` |
| Isolated test | `fairwayd_stage` | **59** | **0** | Has `Course`, `TripDocument`, `PostCollection` |

The latest completed migration recorded in both `fairwayd_stage` histories is:
`20261020193000_add_post_collections`.

The new `GolfServiceVenue` table is not present in the four inspected databases.

**Root cause of the apparent 47 pending migrations:** The previous isolated-branch preflight targeted `neondb`, where only 13 migrations were applied, instead of `fairwayd_stage`. Comparing this to 60 repository migration folders yielded 47 "pending". It did not represent the application database's migration backlog.

**Complete read-only migration name comparison:** GitHub's feature branch has **60 migration folders**. Both the Stage and isolated test `fairwayd_stage` databases contain the **same 59 completed migration names**, with zero unresolved rows and zero migration names absent from the repository. The **sole pending migration** by name is `20261021185500_add_golf_service_directory`. No other migration is pending by name. Existing migration checksums and the new SQL have **not yet undergone an isolated dry-run/rehearsal**, so a read-only audit does not establish deployment safety.

## Safeguards and next actions

1. The feature branch diagnostic `apps/api/scripts/check-golf-services-neon-branch.mjs` now requires `--expected-database=fairwayd_stage`, checks the connection URL's database pathname explicitly and confirms `current_database()` before auditing.
2. The script also validates the expected direct, **non-pooler** test-branch host and uses `BEGIN READ ONLY`; it does not read application environment files inside the git repository.
3. Any future preflight must target **only** the isolated test branch, never the Stage or Production application database.
4. The isolated branch's complete migration **names** are now reconciled against all 60 local migration folders (59 matched, 1 pending). Before any migration rehearsal, independently verify the pending SQL and review checksums/schema assumptions, not just names.
5. Before a test migration, confirm independently that the test connection uses the isolated branch endpoint and `fairwayd_stage` database. Do not use a Railway Stage environment secret as a write target.
6. `apps/api/package.json` currently has `start:prod = npx prisma migrate deploy && node dist/src/main.js`. Keep the feature branch away from the Stage/Production deployment pipeline until migration safety has been independently established.
7. No production or Stage data was modified by this audit.

**Result:** Stage/test branch identities are known, and the 47-pending discrepancy is resolved as a *database selection error*. Database deployment remains blocked pending final checks and explicit authorization.

## Final isolated migration preflight (2026-10-23)

Read-only checks were executed against **Neon project `billowing-breeze-32238900`, branch `br-rough-darkness-ag13g4d3`, database `fairwayd_stage`**, not against Stage or Production.

- Neon confirms the branch was created from the Stage branch, is non-default and not protected.
- The test database has 59 completed migration rows, 0 unresolved rows and no record for `20261021185500_add_golf_service_directory`.
- `Course` exists and its `id` is `text` and primary-key constrained, matching the SQL foreign keys.
- The four new Golf Service tables are absent.
- No current PostgreSQL public objects conflict with the planned new enum, table or index names; no existing `GolfService%` constraints.
- The feature-branch SQL only **creates** new enum types and tables, indexes/constraints, and foreign keys from the new tables to `Course`/new service tables. It does not ALTER existing `Course` columns.
- Local `prisma validate`, Prisma Client generation, API/web builds, and 22 earlier tests already passed as reported by the developer; these tests are not an execution of the SQL migration.

**Status:** Read-only preflight passed. Applying SQL to the isolated test database still changes that branch, so it requires explicit go-ahead and a controlled migration attempt. Stage and Production must remain untouched. After that attempt, check constraints, relationships, migration history and API behavior against the test database; only separately consider Stage after runtime DB URL/database name is verified.
