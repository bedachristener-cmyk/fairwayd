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

## Isolated DDL rehearsal (2026-10-23)

With user authorization restricted to non-existing environments, a **new child branch** `golf-near-me-ddl-rehearsal-20261023` (`br-falling-pond-ag4n6se5`) was created from the existing isolated test branch `br-rough-darkness-ag13g4d3`. No writes were made to its parent, Stage or Production.

- Verified target: Neon project `billowing-breeze-32238900`, database `fairwayd_stage`, 59 previously applied migrations, and no existing Golf Service tables.
- All **26 statements** from the repository's pending migration SQL executed successfully in one transaction on **only the rehearsal child**.
- Catalog checks showed 4 tables, 5 enum types, 16 indexes, 2 XOR owner constraints and 2 foreign keys to `Course`. No new Golf Service rows were left.
- A transaction-based functional check accepted valid venue-owned and Course-owned service/provider links, rejected zero-owner and both-owner links, and rejected duplicate offerings and provider associations. Its temporary rows were deleted.
- Final direct comparison: `GolfServiceVenue` present only on rehearsal child; **absent** on original test branch and on Neon Stage. All three still recorded 59 completed migrations.
- **Prisma migration history deliberately not updated** during direct SQL rehearsal: no row exists for `20261021185500_add_golf_service_directory` even on the rehearsal child. This is not a successful `prisma migrate deploy` test.
- Do **not** point Prisma Migrate at the rehearsal child and run the same migration without first accounting for the already-created structures; that would collide with existing objects.
- Keep this child branch isolated and disposable. To complete a **true Prisma migration rehearsal**, use a separate fresh child copied from the original isolated test branch, with an explicitly verified direct connection URL for `fairwayd_stage`; run Prisma migration there, audit `_prisma_migrations` and inspect resulting schema. Never reuse Stage/Production credentials.

**Result:** SQL DDL + database constraint smoke tests PASS; Prisma migration runner / recorded history NOT YET TESTED. Stage/Production unchanged.

## Prisma migration runner rehearsal – separate fresh child (2026-10-23)

A **new, pristine, disposable** child branch was created from `br-rough-darkness-ag13g4d3`:

- Name: `golf-near-me-prisma-rehearsal-20261023`
- Branch ID: `br-dawn-breeze-agjlgyyt`
- Direct endpoint: `ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech`
- Target PostgreSQL database: `fairwayd_stage`
- Initial state: 59 applied migrations, 0 unresolved, `Course` exists, no Golf Service tables
- It is **not** Stage or Production, and it is **not** the prior SQL-tested `br-falling-pond-ag4n6se5` child.

The connected Neon interface can execute SQL but **cannot invoke the Prisma CLI against a chosen branch**. In particular, do not use `prepare_database_migration`: its input does not allow pinning this child branch. Running SQL manually and inventing a Prisma history record is not equivalent to `prisma migrate deploy`.

To run the CLI safely on the developer's Windows workstation, two scripts were added on the feature branch:

- `apps/api/scripts/Run-GolfServicesPrismaRehearsal.ps1` (PowerShell 5.1, masked local URL prompt; no .env changes).
- `apps/api/scripts/rehearse-golf-services-prisma.mjs` (pins exact direct hostname, database and Git branch; read-only checks for exactly 59 completed + one pending migration; launches only the local Prisma CLI; read-only postcheck requires 60 completed and new tables).

**Before running**: pull the feature branch, open Neon Console → Fairwayd project → `golf-near-me-prisma-rehearsal-20261023` branch → Connection Details → choose database `fairwayd_stage` → **Direct connection (pooling OFF)**; copy connection URL. Enter it **only** in the protected terminal prompt, never in Git, chat, a committed .env file or CLI arguments.

Run from Windows PowerShell:

```powershell
cd C:\dev\fairwayd
git pull --ff-only
cd .\apps\api
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-GolfServicesPrismaRehearsal.ps1
```

The script stops if the direct host or database is wrong. This step will be marked **tested only after the developer returns its output**, and afterwards Neon is checked independently for migrated child and unchanged parent/Stage. No Prisma migrate deploy has yet been executed.

**Never run a raw `prisma migrate deploy` using the existing Railway/Stage database URL** and never deploy the feature branch until separately approved.

## Completed Prisma CLI rehearsal (2026-10-23)

The developer ran `apps/api/scripts/Run-GolfServicesPrismaRehearsal.ps1` with the **direct connection to the disposable Neon child** `br-dawn-breeze-agjlgyyt`, database `fairwayd_stage`.

Reported local CLI output:

```text
Postcheck OK: 60 migrations applied; new service tables exist.
PASS: Prisma migration rehearsal completed; Stage and Production not targeted.
Transient connection variable restored. No .env file modified.
```

Independent follow-up through Neon (read-only SQL) verified:

| Branch | Database | Completed migrations | Golf Service tables | New Prisma migration history entry |
|---|---|---:|---|---|
| Prisma rehearsal `br-dawn-breeze-agjlgyyt` | `fairwayd_stage` | **60** | 4/4 present | **present, finished** |
| Earlier SQL-only child `br-falling-pond-ag4n6se5` | `fairwayd_stage` | 59 | 4/4 present | absent, as expected |
| Original isolated branch `br-rough-darkness-ag13g4d3` | `fairwayd_stage` | 59 | absent | absent |
| Neon Stage `br-broad-salad-ag6pnor0` | `fairwayd_stage` | 59 | absent | absent |
| Neon Production `br-soft-cell-aga965p7` | `fairwayd_prod` | 13 | absent | absent |

All five databases had **zero unresolved migration records**. The successful Prisma child additionally has two exclusive-owner CHECK constraints, two Course foreign keys and 16 Golf Service indexes. Each new Golf Service table has **zero rows** (no pilot data inserted).

**Status:** Full `prisma migrate deploy` rehearsal **PASS** on a disposable child branch; both Stage and Production **unchanged**. This does **not** authorize a Stage/Production deployment: Railway Stage's fully resolved runtime database pathname has not been independently verified, and activating the Golf Services API requires a separately approved rollout. Continue development and test data integration in isolation first.

## Basel pilot real-data smoke test on isolated Prisma branch (2026-10-23)

On the **Prisma-rehearsal child only** (`br-dawn-breeze-agjlgyyt`, `fairwayd_stage`), a review-sourced first venue was loaded for HTTP testing:

- `The Golf Lounge`, Quellenstrasse 37, 4310 Rheinfelden, Switzerland.
- Approximate Q-37 **building** coordinates `47.5495127, 7.786086`; the actual entrance has not been surveyed.
- Four `VERIFIED` **sandbox-only** offering rows: `SIMULATOR` (2 units), `ACADEMY`, `SHOP`, `FITTING`.
- One professional `Sebastian Heijdenberg` linked as `GOLF_PRO` (brand: SebbyGolf).
- Verified flags and timestamps permit the sandbox API test **only**, not publishing/Stage/Production migration.
- The source fixture in `apps/api/scripts/fixtures/ch-basel-golf-services-pilot.json` remains `DRAFT` with null `verifiedAt`; provenance and approximate-coordinate caveat remain visible. Existing Fairwayd `Course` rows have not been modified. Golf Club Rheinfelden is a separate existing course approximately 0.9 km away.
- The initial sandbox transaction inserted 1 venue, 4 offerings, 1 provider, and 1 provider link; a readback confirmed these counts.
- A subsequent repeated cross-environment comparison was blocked by the connector safety checker; do not claim it completed after inserting test data. The insert target was explicitly the disposable child branch.

### Local HTTP integration test (prepared; execution still pending)

Two feature-branch files implement the next safe regression test:

- `apps/api/scripts/test-golf-services-live-api.mjs` is a **read-only** HTTP integration harness. It rejects any host other than `ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech`, any database other than `fairwayd_stage`, a wrong Git branch, missing migration, missing sandbox venue data, or a non-read-only PostgreSQL session. It runs **only** the Golf Services NestJS controller + service, binds to `127.0.0.1` on an OS-assigned port, and checks 503 disabled/200 enabled, simulator + shop filters, no fabricated ranges, Basel 25 km distance, country/region, linked professional and absence of private metadata.
- `apps/api/scripts/Run-GolfServicesLiveApiTest.ps1` provides a masked connection-string prompt compatible with Windows PowerShell 5.1. The URL is **never written to a file**; existing process environment values are restored.

Run locally, after pulling the feature branch:

```powershell
cd C:\dev\fairwayd
git pull --ff-only
cd .\apps\api
npm run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-GolfServicesLiveApiTest.ps1
```

Paste the **direct, unpooled** URL for `golf-near-me-prisma-rehearsal-20261023` / `fairwayd_stage` only in the masked terminal prompt. The harness does not start the real app, change `.env`, call Google, migrate, seed, or write to any database. Share **only the sanitized PASS/FAIL test output** in chat. Stage and Production are not test targets.

## Isolated live HTTP API smoke test – PASS (2026-10-23)

The developer ran `apps/api/scripts/Run-GolfServicesLiveApiTest.ps1` locally on Windows against **only** the disposable Prisma-test Neon branch `br-dawn-breeze-agjlgyyt`, database `fairwayd_stage`, using a direct connection string in the masked terminal prompt.

Reported successful output:

```text
Preflight PASS: isolated database, read-only, 1 venue, 4 offers, 1 pro link.
PASS: Disabled feature returns HTTP 503.
PASS: Simulators -> one real venue, 2 simulators, SebbyGolf instructor.
PASS: Shop filter returns the same venue once.
PASS: No driving range is fabricated.
PASS: Basel 25km search finds the venue with actual calculated distance: 14.9 km.
PASS: Country filter prevents a false French listing.
PASS: Regional golf-services API returns the expected venue.
PASS: All isolated HTTP API smoke tests succeeded; no data changed.
Temporary URL and feature flag restored. No .env file changed.
```

- This is a **genuine local NestJS HTTP controller/service integration test**, not a unit-test mock and **not a Railway deployment**.
- The script enforces the direct host `ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech`, database `fairwayd_stage`, branch-specific pilot fixture, and read-only transactions. A temporary loopback HTTP server is used.
- One tested venue is returned for the simulator category with two simulator units, one linked instructor, and correct region/country/category filtering. No duplicate or invented golf-course link is created.
- A PostgreSQL `libpq` SSL-compatibility warning was printed during the test. It did **not** fail the test; consider tightening SSL verification policy separately.
- No Stage or Production deployment or database changes were requested or performed by the test harness. Test data are isolated and are **not authorized for production publication**.
- **Still pending before Stage:** verify Railway Stage's runtime database path, decide rollout strategy and feature flag, and perform explicit Stage-specific change approval. Keep the original Git pilot fixture in DRAFT until a publication review.
