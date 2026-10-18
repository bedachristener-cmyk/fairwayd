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
