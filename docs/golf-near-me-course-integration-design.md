# Golf Near Me — link new services to existing courses

**Status: IMPLEMENTED ON FEATURE BRANCH ONLY; schema and pending SQL migration edited, never applied to a database.**
**Branch:** `feature/golf-near-me-ch-pilot`.

## Decision / source of truth

A physical golf course is always represented by the existing `Course.id`, not by a separate publicly listed `GolfServiceVenue`.

- **Course-located service:** An offering/provider link references the existing `Course.id`. No shadow `GolfServiceVenue` record.
- **Independent service venue:** An offering/provider link references a `GolfServiceVenue.id`.
- **Professional/provider identity:** A single `GolfServiceProvider` may be linked to several courses or independent venues. A provider is not itself a physical venue unless it operates its own separately verified location.
- **Multiple offerings:** An existing golf course may have a driving range, simulators, fitting, instruction, or shop. Display them in its existing Golf Near Me result and on the existing course detail route; show one map marker.
- **Independently operating tenant:** Preserve the distinct provider/business relationship without pretending it is a separate physical golf course. Distinct, separately visitable facilities require manual location identity review.

## Schema and pending migration change (implemented, not validated or applied yet)

The previously pending Golf Services migration now includes the following **exclusive-or owner** relationship. It has **not** been applied to any database:

| Entity | Existing | Proposed |
|---|---|---|
| `GolfServiceOffering` | required `venueId` | nullable `venueId` **or** nullable `courseId`; exactly one must be non-null |
| `GolfServiceVenueProvider` | required `venueId` | nullable `venueId` **or** nullable `courseId`; exactly one must be non-null |
| `Course` | no service relations | inverse relations to both link types |
| `GolfServiceVenue` | independent facility | remains independent; must not be a duplicate of an existing course |

PostgreSQL XOR check constraint on each owner table:

```sql
CHECK (
  ("venueId" IS NOT NULL AND "courseId" IS NULL)
  OR
  ("venueId" IS NULL AND "courseId" IS NOT NULL)
)
```

Separate owner-scoped unique indexes:
- `GolfServiceOffering(venueId, category)` and `GolfServiceOffering(courseId, category)`.
- `GolfServiceVenueProvider(venueId, providerId, role)` and `GolfServiceVenueProvider(courseId, providerId, role)`.

These uniqueness rules intentionally encode at most one offering *category* per owner, matching the existing model. Before implementation, determine whether several independently operated shops/pros offering the same category at one course must be represented via distinct provider links, offerings, or another subdivision; do not silently merge independent operators.

## Publication and discovery logic

1. Continue using existing `GET /api/courses/nearby` for active courses.
2. Golf services search must be able to resolve *verified* offerings associated with `Course.id` as well as independent `GolfServiceVenue.id`. No second course-location response or duplicate marker.
3. For a course result, merge category badges/details from its linked verified offers; preserve `/courses/:id` as its detail route and its existing coordinates.
4. For independent service venues, keep their own coordinates, distances and venue details. The public API still requires `VERIFIED` and a non-null `verifiedAt`, and must not leak review notes, source URLs or Place IDs.
5. Partial-service outages must not hide existing courses; draft services must never be displayed as verified. For service-category filtering, only a Course with an actual matching verified `courseServices` entry can be shown. A successful unfiltered Course lookup alone is insufficient.
6. A Golf Service discovery candidate that resembles an existing `Course` is held for review until its identity is resolved. Automated name/address/proximity tests are candidate checks, **not** a permission to merge or publish.
7. A Swiss-affiliated golf club whose physical course is in France still uses its actual geographic coordinates; club affiliation must not overwrite location country.

## Tests before migration

- Course with two different services -> **one** course item and **one** map marker. *(API unit test added, local execution pending.)*
- Course with a linked pro and shop -> still one course result; show both services.
- Course + independent tenant at same street address -> no automatic merge by street address alone.
- Existing course + duplicate newly discovered venue -> blocked/review required, not published twice.
- Independent simulator with multiple offerings -> one independent venue.
- Same professional at two venues -> one provider identity with two links.
- XOR constraint refuses an offering/provider link with zero owners or both owners.
- Repeated offering category for one owner is refused (current v1 limitation).
- Disabled Golf Services API does not break active course search.
- `Course.active` and `Course.verified` must be considered separately when defining the publication policy.

## Deployment safety gate

Do not run `prisma migrate deploy`, `prisma db push`, inserts, or activate `GOLF_SERVICES_API_ENABLED`.

The isolated `golf-near-me-dev` Neon branch was cloned from a Neon `stage` branch whose endpoint does not match the Railway Stage DB endpoint. The read-only preflight saw **47 pending migrations**. Resolve the true Stage DB mapping and migration baseline first.

The current pilot preview validator has **8 passing tests** for fixture-only deduplication and draft rules. It does **not** establish global or cross-table deduplication.

**Implementation status:** (1) link model documented; (2) Prisma schema, pending migration, nearby API, frontend category-filter merging and tests updated on the feature branch; (3) local `prisma validate`, API/web builds and tests still required; (4) database environment reconciliation still required; (5) isolated migration rehearsal only after explicit authorization.

**Additional deployment hazard:** `apps/api/package.json` currently defines `start:prod` as `npx prisma migrate deploy && node dist/src/main.js`. Therefore simply deploying API code that contains this pending migration may apply it automatically. **Do not deploy/merge to Stage or Production while this remains unresolved.**

**Known limitation:** SQL XOR, owner-scoped uniqueness, and read-only fixture checks cannot prevent a different `GolfServiceVenue` from coincidentally representing the same physical place as an existing Course. Pre-publication identity checks against Course remain required.
