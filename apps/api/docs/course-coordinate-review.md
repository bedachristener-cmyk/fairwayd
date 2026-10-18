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
