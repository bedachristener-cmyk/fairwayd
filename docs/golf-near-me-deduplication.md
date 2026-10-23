# Golf Near Me – identity, source of truth and duplicate-prevention gate

Status: **Design checkpoint – do not deploy or seed Golf Service tables yet.**
Scope: Basel pilot and any future golf-service discovery.

## Physical identity and existing courses

1. The existing `Course` entity is the source of truth for golf courses, their coordinates, course IDs, ratings, follows, and detail pages.
2. **Never create another `Course` record** when discovering a simulator, driving range, shop, fitting service, golf pro or academy.
3. For a business **on the premises of an existing course**, resolve the existing Course first. Do not create a second public location card automatically. The service must eventually be attached to that Course or a clearly separate, independent business, and the user should see a single physical place when appropriate.
4. A business at a different physical location is its own `GolfServiceVenue`. A venue may have several service categories; independent professionals link to the venue, not to a duplicate venue record.
5. Proximity alone does not prove identity: two independent shops or a golf pro may share an address or building. A club's Swiss affiliation does not imply the course physically lies inside Switzerland (e.g. clubs near Basel with facilities in France).

## What is already protected

- A venue's `googlePlaceId` and `osmRef` are unique **within `GolfServiceVenue`**.
- An offering's `(venueId, category)` is unique.
- A linked provider's `(venueId, providerId, role)` is unique.
- The manually reviewed JSON pilot fixture blocks identical names + full postal address even if references or punctuation differ. It does **not** conflate different business names at the same address.
- Existing nearby golf courses are obtained through `GET /api/courses/nearby`, which selects active courses. Nothing is copied into the service tables.

## Remaining architecture blocker

The current Prisma schema **has no relationship from `GolfServiceVenue`, `GolfServiceOffering` or `GolfServiceVenueProvider` to an existing `Course.id`**.

Therefore the present uniqueness constraints CANNOT prevent a service at a golf club from being represented as a second physical location.

**Before applying the pending Golf Service migration or importing real venues:** decide the relational design for offers/providers attached to a pre-existing Course. One likely option is for an Offering and VenueProvider association to target exactly one of: `Course` or `GolfServiceVenue`. Another is a dedicated identity/link table. Select and test a design first; do not invent a shadow Course or duplicate its address/coordinates into a new public venue as a workaround.

## Matching and review policy (planned ingestion)

1. Exact existing source identifiers -> strong match *within the same entity type*, but still cross-check Course mapping.
2. Normalized name + complete postal address -> **review required** for a candidate duplicate. Normalize whitespace, punctuation, case, and common diacritics.
3. Very close coordinates + similar business identity + operator website -> **review required**, never automatic merge by distance alone.
4. Shared address, operator domain or golf-pro workplace alone -> **insufficient** to merge.
5. If a potential Course overlap cannot be resolved -> keep the discovered venue in **DRAFT** and block publication/import; do not present a second location in Golf Near Me.
6. Maintain evidence, source, verifiedAt, and any independently verified golf pro relationships. Do not treat Google Places data as persistable listing content beyond allowed identifiers.
7. `Course.active=true` and `Course.verified=true` are distinct fields. The current nearby API filters on active only; any additional public quality gate must be specified separately.

## Safe next steps

- Continue local read-only fixture validation and independent course-list checks.
- The former 47-pending discrepancy has been resolved as an audit of the wrong database (`neondb`). Stage and isolated test branch each have `fairwayd_stage` with 59 applied migrations and no unresolved migration records. Confirm the app's runtime database pathname and reconcile local migration names before any test migration. See `docs/golf-near-me-neon-audit.md`.
- Design/test the Course ↔ service-offering association on the feature branch.
- No `prisma migrate deploy`, `db push`, inserts, publishes, or Stage/Production deploys at this checkpoint.
