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

Generate Google Places candidates for one country. This performs external API
requests but never updates the database:

```powershell
npx ts-node scripts/google-places-course-review.ts CH 91 --dry-run
```

The generated CSV includes `country`, `reviewDecision`, and `reviewNotes`.
Never apply the generated file automatically.

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
