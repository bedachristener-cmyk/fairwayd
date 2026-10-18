# Course coordinate review

Course coordinates must be reviewed country by country before exact course
geometry is added to the map.

## Safety rules

- Inventory and candidate generation never update the database.
- A Google Places result is a candidate, not proof that the coordinate is correct.
- Every update row must have `reviewDecision=APPROVE`.
- Blank, `KEEP`, `REJECT`, and `REVIEW` rows are never updated.
- Apply mode requires both `--apply` and
  `--confirm-reviewed-course-coordinates`.
- The database course name and previous coordinates must still match the review
  CSV. A mismatch aborts the complete run.
- Apply mode writes a local ignored JSON manifest before the transaction.
- Coordinates, the PostGIS geography point, source, and verified flag are
  updated together.
- Duplicate records and multi-course facilities require a separate merge
  review. This workflow never deletes or merges courses.

## Inventory

```powershell
npx ts-node scripts/audit-course-coordinates.ts
```

The generated files are written to `course-audits/` and ignored by Git.

## Candidate review

Use a dedicated server-side Google key in `apps/api/.env`:

```dotenv
GOOGLE_PLACES_REVIEW_API_KEY=...
```

The Google Cloud project must have billing and Places API (New) enabled. Restrict
the key to Places API (New) and, for local server-side execution, to the public
IP address from which the review command runs. The existing
`GOOGLE_MAPS_API_KEY` remains a compatibility fallback and does not need to be
relaxed.

Generate Google Places candidates for one country. This performs external API
requests but never updates the database:

```powershell
npx ts-node scripts/google-places-course-review.ts CH 91 --dry-run
```

The generated CSV includes `country`, `candidateRank`, `reviewDecision`,
and `reviewNotes`. Google can return up to three candidate rows per course in
one billable request. Review all candidates, but set `APPROVE` on at most one
row per course. The apply preflight rejects duplicate approved course IDs.

Never apply the generated file automatically. If Google rejects any API request,
the command aborts and does not write or overwrite the candidate CSV.

Allowed decisions are:

- `APPROVE`: use the Google coordinates
- `KEEP`: retain the current coordinates
- `REJECT`: candidate is wrong
- `REVIEW`: unresolved
- blank: not reviewed

## Dry-run

```powershell
npx ts-node scripts/apply-reviewed-course-coordinates.ts <review.csv> --country CH
```

## Apply reviewed rows

Only after checking every approved row and the dry-run output:

```powershell
npx ts-node scripts/apply-reviewed-course-coordinates.ts <review.csv> --country CH --apply --confirm-reviewed-course-coordinates
```

## Reviewed Switzerland correction

The reviewed CH correction is intentionally separate from the candidate CSV. It
soft-deactivates the false `Golf Club Langenthal` duplicate after confirming
that it still shares the reviewed Golf Limpachtal coordinates, and creates the
missing verified `Golf Emmental` record. It never hard-deletes a course or its
relations.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-ch-course-corrections.ts
```

Apply only after reviewing the preflight output:

```powershell
npx ts-node scripts/apply-reviewed-ch-course-corrections.ts --apply --confirm-reviewed-ch-course-corrections
```

Apply mode writes an ignored JSON manifest before the transaction. Re-running
the command is idempotent when the reviewed state is already present.


## Switzerland completeness discovery

The completeness discovery is independent from the name-by-name coordinate
review. It queries an overlapping grid across Switzerland for Google Places of
type `golf_course`, deduplicates Place IDs, and compares every discovery with
the active CH courses in the database.

The run is read-only but makes 117 Nearby Search requests, so the explicit
request confirmation is required:

```powershell
npx ts-node scripts/google-places-course-discovery.ts CH --dry-run --confirm-google-places-requests
```

The generated `course-audits/ch-google-places-discovery.csv` uses these
statuses:

- `MATCHED`: a Google golf course is within 0.75 km of an active database course
- `REVIEW_NEARBY`: nearest active course is between 0.75 and 3 km away
- `POSSIBLE_MISSING`: nearest active course is more than 3 km away
- `DATABASE_ONLY`: active database course has no Google golf-course result
  within 0.75 km

All non-matched rows require manual review. A `DATABASE_ONLY` row is not proof
that the database record is wrong; private or small courses may not be
categorized as `golf_course` by Google. If any search cell returns Google's
20-result maximum, the command warns that coverage may be truncated. This
workflow never writes to the database.


## Reviewed missing Switzerland courses

The completeness comparison identified 17 reviewed outdoor courses that are not
represented by an active database course. Before creating records, generate a
small Google candidate file to verify the exact Place IDs, addresses, and
coordinates:

```powershell
npx ts-node scripts/google-places-missing-ch-course-review.ts --dry-run --confirm-google-places-requests
```

This performs 17 Text Search requests and writes
`course-audits/ch-missing-course-google-candidates.csv`. It never updates the
database. Review every course and select at most one candidate before preparing
a guarded database correction.


## Reviewed Switzerland reconciliation

After the 17 Google candidates have been manually confirmed, run the guarded
reconciliation preflight:

```powershell
npx ts-node scripts/apply-reviewed-ch-course-reconciliation.ts
```

The dry-run verifies all current names and coordinates, checks the three
duplicate records against their active canonical records, reports dependency
counts, validates the two reviewed renames, and checks every new coordinate for
an active collision. No database rows are changed.

Apply is intentionally separate and requires the explicit confirmation flag:

```powershell
npx ts-node scripts/apply-reviewed-ch-course-reconciliation.ts --apply --confirm-reviewed-ch-course-reconciliation
```

Apply writes an ignored JSON manifest before one database transaction. It
creates or reactivates the 17 reviewed courses, updates their PostGIS points,
renames the two reviewed records without changing their IDs, and soft-deactivates
the three exact-coordinate duplicates. Apply stops before the transaction when
an active duplicate has dependent followers, ratings, posts, reviews, or trip
items. Re-running is idempotent when the reviewed state is already present.

## Country-neutral review pipeline

The reusable pipeline separates discovery, human review, coordinate updates,
and additions. Google results are never applied automatically.

Supported discovery country profiles are defined explicitly in
`src/courses/course-discovery-country.ts`. A profile contains reviewed country
bounds, overlapping grid spacing, and a search radius. Unsupported countries
fail closed instead of accepting arbitrary bounds.

Generate the read-only discovery report for a supported country:

```powershell
npx ts-node scripts/google-places-course-discovery.ts AT --dry-run --confirm-google-places-requests
```

The Austrian profile currently plans 220 Nearby Search requests. The command
prints the request count before the first request, writes
`course-audits/at-google-places-discovery.csv`, and never updates the database.
The CSV includes editable metadata columns for reviewed additions. Only
`POSSIBLE_MISSING` and unresolved nearby rows should be considered; Google
results such as driving ranges, indoor golf, shops, hotels, and disc golf must
be rejected manually.

For existing records, continue with the generic name-by-name candidate review
and coordinate apply workflow described above.

For a genuinely missing outdoor course, fill `country`, `name`, `city`,
`region`, `postalCode`, `holes`, and `website` in a copy of the discovery
CSV. Retain the selected `placeId`, `googleLat`, and `googleLon`, then set
`reviewDecision=APPROVE`. At most one approved row may use a name or Google
Place ID.

Dry-run reviewed additions:

```powershell
npx ts-node scripts/apply-reviewed-course-additions.ts <review.csv> --country AT
```

Apply only after the dry-run and manual review:

```powershell
npx ts-node scripts/apply-reviewed-course-additions.ts <review.csv> --country AT --apply --confirm-reviewed-course-additions
```

The additions importer rejects invalid metadata, country mismatches, duplicate
names or Place IDs, an existing same-name course at other coordinates, and any
active course within 50 metres. Nearby multi-course facilities and duplicates
therefore require explicit reconciliation. Apply writes an ignored JSON
manifest before one transaction, creates or reactivates only approved rows,
updates the PostGIS point, verifies the final active-country count, and is
idempotent on a second dry-run.



## Reviewed Austria facility reconciliation

Fairwayd uses one map marker per golf facility. Separate layouts at the same
facility, such as academy, compact, park, south, 9-hole, or additional 18-hole
courses, do not receive their own course record. Independent nearby facilities
remain separate.

The first reviewed AT reconciliation contains 14 clear duplicate or
facility-variant records and two wrong-country records. Ambiguous historical
records are deliberately excluded. The preflight verifies immutable IDs, names,
countries, and original coordinates, requires every canonical facility to
remain active, and reports dependency counts.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-facility-reconciliation.ts
```

No database rows are changed. Apply is a separate operation and requires:

```powershell
npx ts-node scripts/apply-reviewed-at-facility-reconciliation.ts --apply --confirm-reviewed-at-facility-reconciliation
```

Apply is blocked when a record selected for deactivation has followers,
ratings, posts, reviews, or trip items. Those relations must first be reviewed
and migrated to the canonical facility. A JSON manifest is written before the
single transaction, and deactivation is soft rather than destructive.


## Reviewed Austria reconciliation batch 2

The second reviewed AT batch combines 21 confirmed coordinate corrections with
reviewed current facility names. It preserves separate markers for physically
separate sites: the Rinn course remains `Golfclub Innsbruck-Igls`, while the
independent nine-hole site is corrected to `Olympia Golf Igls`.

Three unresolved records are deliberately excluded from all changes:
`Golfclub Dornbirn`, `Golfclub Thayatal`, and `Golfclub Weststmk`.
The unverified `Golfclub am Orient` record is handled separately as a guarded
soft-deactivation candidate. Apply is blocked if that record has followers,
ratings, posts, reviews, or trip items.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-course-reconciliation-batch-2.ts
```

Apply only after reviewing every preflight row:

```powershell
npx ts-node scripts/apply-reviewed-at-course-reconciliation-batch-2.ts --apply --confirm-reviewed-at-course-reconciliation-batch-2
```

The command validates immutable IDs, country, original or already-applied
name-coordinate tuples, active target-name collisions, and the expected active
AT count. Apply writes an ignored JSON manifest before one transaction, updates
the PostGIS geography points together with latitude and longitude, and is
idempotent on a second dry-run.


## Final reviewed Austria unresolved-course cleanup

The remaining three ambiguous AT records are resolved conservatively using
official regional inventories and a verified regional tourism coordinate.

- `Golfclub Thayatal` is retained, renamed to
  `Golfclub Thayatal-Drosendorf`, and moved to the reviewed Autendorf
  facility coordinate.
- `Golfclub Dornbirn` and `Golfclub Weststmk` are unsupported synthetic
  records and are selected for guarded soft-deactivation.
- No nearby real facility is reused as a substitute for either invalid record.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-unresolved-course-reconciliation.ts
```

Apply only after confirming both invalid records have zero dependencies:

```powershell
npx ts-node scripts/apply-reviewed-at-unresolved-course-reconciliation.ts --apply --confirm-reviewed-at-unresolved-course-reconciliation
```

The command verifies immutable IDs, original or already-applied name-coordinate
tuples, target-name collisions, dependency counts, and the expected active AT
count. It writes an ignored JSON manifest before one transaction and updates
the PostGIS point together with the Thayatal latitude and longitude.


## Reviewed Austria missing-course additions batch 1

The first additions batch contains ten manually reviewed outdoor facilities that
were absent after the existing Austrian records were reconciled. It deliberately
excludes ambiguous discovery results, indoor golf, shops, hotels, and duplicate
Google entries for the same facility.

Fairwayd continues to use one marker per physical site. Therefore the 18-hole
and 9-hole layouts at Traminergolf Klöch are represented by one 27-hole facility
record. The separate nine-hole site at Lans receives its own marker and is not
merged into the existing Rinn site.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-1.ts
```

The preflight checks reviewed metadata, duplicate names, pairwise proximity,
same-name database rows, and active facilities within 50 metres. With the
reviewed state after the final Austria cleanup, it should report ten creates and
an expected active AT count of 109.

Apply only after reviewing all ten rows:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-1.ts --apply --confirm-reviewed-at-missing-course-additions-batch-1
```

Apply writes an ignored JSON manifest before one transaction, creates or
reactivates the reviewed records, updates every PostGIS geography point, and
verifies the final active-country count. A second dry-run must report zero
creates and ten already-present records.


## Reviewed Austria missing-course additions batch 2

The second additions batch contains ten further manually reviewed outdoor
facilities. Duplicate discovery results for the same site are represented once.
The facility rule also applies to course layouts: Pischelsdorf combines its
18-hole and 6-hole layouts in one 24-hole record, and Römergolf combines its
18-hole and 9-hole layouts in one 27-hole record.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-2.ts
```

After batch 1 has been applied, the expected preflight is ten creates with an
active AT count increasing from 109 to 119. Apply remains separate:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-2.ts --apply --confirm-reviewed-at-missing-course-additions-batch-2
```

The same safeguards as batch 1 apply: reviewed-definition validation, name and
50-metre collision checks, dry-run by default, an ignored JSON manifest before
the transaction, PostGIS point updates, final active-count verification, and an
idempotent control run.


## Reviewed Austria missing-course additions batch 3

The third additions batch contains ten further current outdoor facilities.
Historical Golfclub Waidhofen is deliberately excluded: available evidence
marks the former nine-hole course as closed, while the current site is described
as a separate three-hole compact training facility and requires its own review.

Open Golf St. Johann is represented once as an 18-hole physical facility
comprising two nine-hole layouts. The remaining reviewed sites each receive one
marker.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-3.ts
```

After batches 1 and 2, the expected preflight is ten creates with an active AT
count increasing from 119 to 129. Apply remains separate:

```powershell
npx ts-node scripts/apply-reviewed-at-missing-course-additions-batch-3.ts --apply --confirm-reviewed-at-missing-course-additions-batch-3
```

The batch uses the same dry-run, collision, manifest, transaction, PostGIS,
active-count, and idempotence safeguards as the preceding additions.


## Final reviewed Austria course reconciliation

After the three ten-course addition batches, the remaining discovery report is
closed in one consolidated reconciliation instead of further artificial
batches. It adds six current outdoor facilities:

- Golfclub Salzburg – Golfacademy Rif
- Golfclub GolfMaxX
- Golfclub Tuttendörfl
- Golfclub Waldhof
- Öko Golf Neusiedler Csarda
- Golfpark & Trainingszentrum Waidhofen/Thaya

GolfMaxX and Tuttendörfl are retained as separate markers because they are
separate neighbouring nine-hole courses. Golf-Club Arlberg is not added because
an active marker for the same facility already exists within 50 metres.
Citygolf Vienna was deferred from this earlier discovery batch. The later
directory review confirmed that Golfpark Vienna / GC Wien-Süßenbrunn is a
distinct physical facility from the active Golf Club Wien marker and adds the
combined facility in the directory reconciliation. The former Waidhofen nine-hole course remains closed; the reviewed record
represents the current six-hole compact training facility.

Dry-run:

```powershell
npx ts-node scripts/apply-reviewed-at-final-course-reconciliation.ts
```

After batch 3 has been applied, the expected preflight is six creates with an
active AT count increasing from 129 to 135. Apply remains separate:

```powershell
npx ts-node scripts/apply-reviewed-at-final-course-reconciliation.ts --apply --confirm-reviewed-at-final-course-reconciliation
```

The command validates the reviewed definitions, checks database names and
50-metre collisions, writes an ignored JSON manifest, applies all changes in one
transaction, updates PostGIS points, verifies the final active count, and is
idempotent on a second dry-run. Important rejected discovery rows are retained
as reviewed exclusions in the source definition.


## Austria directory completeness audit

Google Places Nearby Search is not a complete national inventory. Facilities
can be absent when Google categorizes them as a golf school, training facility,
or another place type. `Golfclub Seefeld-Reith` is the confirmed example: it is
a separate active nine-hole course from `Golfclub Seefeld-Wildmoos`, but it was
not returned as a distinct golf-course discovery.

Run the independent read-only directory comparison after every Austrian
reconciliation:

```powershell
npx ts-node scripts/audit-austrian-course-inventory.ts
```

The command downloads the current Austrian directory table, requires at least
120 parsed rows, compares it with all active AT database courses, and writes
`course-audits/at-directory-inventory-audit.csv`. It never changes the
database. `MATCHED` means a conservative name-and-city match. Every `REVIEW`
row must be checked manually against the operator or regional association before
an addition, rename, merge, or exclusion is prepared. Directory presence alone
is not sufficient evidence for a database mutation.


## Consolidated Austria directory candidate review

The independent directory audit and database collision preflight leave 23
physically distinct, currently active facilities that are not represented by an
active database marker. `Golfclub Gut Richardhof` is excluded because the same
facility is already active as `Golfclub Richardshof`. `Golfpark Klopeinersee-Südkärnten`
is already active as `Golfpark Klopeinersee`. Other harmless name
variants are excluded. The closed Bad Gleichenberg course is also excluded
because its operator ended golf-course operations on 31 December 2025.

Generate all Google Places candidates in one consolidated read-only run:

```powershell
npx ts-node scripts/google-places-at-directory-missing-course-review.ts `
  --dry-run `
  --confirm-google-places-requests
```

The command makes exactly 23 Text Search requests and writes
`course-audits/at-directory-missing-course-google-candidates.csv`. It never
changes the database. One physical facility receives one candidate definition,
even when it has multiple layouts. Nearby independent sites such as
Seefeld-Reith and Seefeld-Wildmoos, Kitzbühel-Kaps and Schwarzsee, Rasmushof,
Mühlberghof and Wilder Kaiser, and Linsberg and Föhrenwald remain separate.

The reviewed file selected the golf-club result for Seefeld-Reith and the
golf-course result for Rasmushof. All 23 selected Place IDs and coordinates are
unique. No candidate is applied automatically.

Run the complete guarded preflight:

```powershell
npx ts-node scripts/apply-reviewed-at-directory-course-reconciliation.ts
```

With the reviewed state at 135 active Austrian facilities, the expected result
is 23 creates and `active_AT_expected=158`. The preflight checks same-name
rows, all active facilities within 50 metres, pairwise candidate proximity,
metadata, coordinates and Place IDs.

Apply only after reviewing the complete preflight:

```powershell
npx ts-node scripts/apply-reviewed-at-directory-course-reconciliation.ts `
  --apply `
  --confirm-reviewed-at-directory-course-reconciliation
```

Apply writes an ignored JSON manifest before one database transaction, creates
or reactivates all reviewed facilities, updates every PostGIS point, verifies
the final active-country count and is idempotent on a second dry-run.
