# Fairwayd Golf Near Me — Switzerland pilot

Status: discovery prototype only. No production or stage database changes.

## Product goal

Help golfers find golf-related businesses and practice facilities near them and in Explore regions, independently of the existing golf-course discovery and map markers.

### MVP categories
- **SIMULATOR**: indoor golf, golf simulators, TrackMan/virtual golf.
- **SHOP**: dedicated golf equipment shops or golf-focused sporting-goods shops.
- **RANGE**: driving ranges, including standalone ranges. Ranges inside golf courses require an access check before publication.
- **ACADEMY**: golf instruction and coaching facilities.
- **FITTING**: dedicated club fitting services.

Golf hotels/resorts are excluded from the first pilot; they may become a separate category later.

## Pilot stages

1. **Discovery**: run `apps/api/scripts/discover-ch-golf-services-osm.mjs` against OpenStreetMap / Overpass to produce a local review list. Default mode only prints the query and makes **no network requests**.
2. **Manual verification**: start with Northwestern Switzerland/Basel, then Zürich/Bern, followed by national coverage. Verify actual service, operational status, accessibility to non-members, and duplicates. Do not automatically publish candidates.
3. **Separate service model**: create a dedicated `GolfService` (or equivalent), leaving `Course` and its discovery/import scripts untouched. Keep attribution and provenance fields, coordinates, verification state, website and independent service categories.
4. **Read-only API**: add server-side filtering by latitude, longitude, radius (10/25/50/100 km) and service category. Provide a country/region filter suitable for Explore.
5. **UI**: introduce Explore > Golf Services / Golf Near Me, with opt-in location or manual city search, list view first, and a separate map layer later. Avoid mixing service points with course markers.
6. **QA**: verify Basel-area pilot against reality, confirm filtering, no duplicate course markers, and no regression in CH/ZA course search.

## Data and licence safeguards

- The prototype uses **OpenStreetMap** tags, not Google Places batch harvesting. Source data is under the **Open Database License (ODbL)**. Add visible OSM attribution in any public listing/map and review ODbL derivative-database / share-alike obligations before importing into a persistent Fairwayd database. See https://www.openstreetmap.org/copyright and https://osmfoundation.org/wiki/Attribution_Guidelines .
- **Google Places content must not be pre-fetched or indefinitely stored as a Fairwayd directory.** Place IDs are an exception to Google's caching restrictions; other data and UI/map attribution restrictions apply. If Google Places is incorporated later, design compliant on-demand requests and use Google Maps for any map showing its place content. See https://developers.google.com/maps/documentation/places/web-service/policies .
- Do not conflate a Google Maps business listing with a verified course or a public golf-service venue.
- Public Overpass instances have resource/rate limits. The pilot uses one opt-in request per run, with no automatic retries. Do not schedule repeated countrywide scans against a public endpoint.
- All review CSVs are local, untracked (`*.csv` is ignored); no secrets, Google API requests, database writes, or stage/prod deployment are involved in discovery.

## Run (from `apps/api`)

```powershell
node scripts/discover-ch-golf-services-osm.mjs
# View query and planned output — no HTTP request

node scripts/discover-ch-golf-services-osm.mjs --fetch
# Explicitly run one read-only CH-wide OpenStreetMap query and write local review CSV
```

The script also supports `--input=PATH` to transform a saved Overpass JSON file without network access.

Output: `service-audits/ch-golf-services-osm-review.csv`.

CSV records are **candidates**, not a verified business directory. A separate review and import step is required.

## Acceptance criteria for the pilot

- At least the five MVP categories are searchable in the UI, with list filters and distances where coordinates are known.
- No service candidates appear as golf-course markers or enter the existing `Course` table.
- Each published record has an independently verified category, location, source and review date.
- Manual city search works without granting precise-location access.
- Geographic filtering supports the Swiss pilot and does not hard-code CH in the eventual service API.
- Visible licensing/attribution is present and no paid third-party discovery calls occur without explicit opt-in.


## Pilot finding, 2026-10-21: OSM coverage is insufficient

The initial Basel-region OSM query produced just three RANGE candidates (two unnamed / generic and one Lindfeld Mägenwil). This is not evidence that the region lacks shops or simulators; it is evidence that many facilities lack the searched OSM tags. Do **not** equate OSM coverage with actual business coverage.

**Revised source strategy:** combine independent supplier/business websites and editorial review for a persistent Fairwayd-owned services directory with live Google Places lookups as an optional discovery/search provider. OSM continues as a supplementary, properly attributed source. Keep data from Google Places out of a persistent directory except for fields expressly permitted by its terms (e.g. Place IDs). If displaying Google Places content in a non-Google map, stop: Places results mapped as markers must use a Google Map; a standalone list requires Google Maps attribution.

A capped Basel-category live coverage probe was added as `apps/api/scripts/probe-ch-golf-services-google.mjs`:

```powershell
cd C:\dev\fairwayd\apps\api
node scripts/probe-ch-golf-services-google.mjs
# Preview only; no requests

node scripts/probe-ch-golf-services-google.mjs --fetch --confirm-google-places-requests
# Five potentially billable Google Places Text Search requests; prints candidates
# to terminal only, does not save or insert any data
```

Use existing server-side `GOOGLE_PLACES_REVIEW_API_KEY` or `GOOGLE_MAPS_API_KEY` from apps/api/.env; never copy credentials to the frontend or into chat. Review API pricing and quotas before live requests.

For a first UI MVP, display independently verified service data in Fairwayd's existing OpenStreetMap/Leaflet map. If separately rendering live Google Places results, start with a list with proper attribution (or a distinct Google Map), and do not merge Google-provided coordinates with a Leaflet map.

## Pilot discovery checkpoint — Basel region (2026-10-21)

The first Overpass run for the Basel region yielded **only 3 candidate features**, all labelled RANGE. Two lacked useful names or websites. This is **insufficient coverage** for the Golf Near Me product. Expanding OSM tag patterns alone is not a reliable solution.

Independently discoverable reference providers exist in the same area (verify actual operation and website before publication):
- The Golf Lounge / SebbyGolf (Rheinfelden): simulator, coaching, fitting; possible business aliases sharing one venue. Primary source: https://thegolflounge.ch/
- Golfschmiede (Rheinfelden): TrackMan indoor golf; primary source: https://www.golfschmiede.ch/
- Golfers Paradise Aquabasilea (Pratteln): golf shop; primary source: https://golfersparadise.ch/pages/unsere-filialen
- Golf Center Basel (Allschwil): shop and fitting; primary source: https://golfcenter.ch/basel/
- Golf Corner (Basel): indoor simulator; verify official source https://golf-corner.ch/

One directory, https://www.golfsimulators.ch/de, publishes a broader independently maintained Swiss indoor-golf inventory. **Do not scrape, import, or redistribute its dataset without appropriate rights/permission.** It is a discovery lead and benchmark only.

### Revised strategy

- **Do not equate OSM results with completeness** or publish its unreviewed candidates.
- Source discovery should combine: voluntary business submissions / official websites, OSM with required ODbL compliance, and optional compliant **live** Google Places discovery and display.
- If using Google Places, keep its fetched data ephemeral and respect caching, attribution, map restrictions, billing and quota safeguards. Only persistent IDs where policy allows, or independently verified facts from operator sites under a separate lawful basis. Do not construct a persistent business directory by copying Google Places data.
- Deduplicate venues by identity, address and independent website; one provider may have several brands and several categories.
- Include clubs that offer public-access driving ranges, lessons, fitting or pro shops, but do not duplicate their whole golf course as a new service venue without a distinct service.
- Prefer regional source cross-checks and a measurable manual **recall benchmark** (known examples found / known examples). OSM baseline currently misses the referenced indoor facilities and retail shops.
- For near-me searches near national boundaries, **distance-radius should not silently exclude DE/FR**: offer a country filter separately from geodesic radius.
- Before introducing API calls, show planned number of requests and projected Google Places cost; require explicit invocation and apply budgets/rate limits.

**Next engineering step:** build a small region-Basel test fixture from independently verified operator sources, compare discovery recall, then design a compliant service search API (live enrichment where permitted) before building the public UI.

## Minimal Google Places comparison (bounded pilot)

Opt-in helper: `apps/api/scripts/discover-ch-golf-services-places.mjs`.

- **No API calls** when launched without flags.
- Runs only with both `--fetch` and `--confirm-google-places-requests`.
- First batch: **three** Text Search Pro calls for Basel/Rheinfelden/Pratteln; optional second batch of **two** further calls covering fitting and driving ranges.
- Local safety stop: maximum five calls per UTC day in this checkout. The call log is request timestamps/numbers only at `apps/api/service-audits/ch-golf-services-places-usage.csv` (untracked). It does **not** impose a project-wide Google Cloud spending limit; configure quotas and budget alerts separately. Billing/free limits are shared with the course-discovery project.
- No retry loop, no Google data caching, no database writes, no changing golf course records. Responses are shown temporarily in the console for comparison and independent verification against official business websites.
- Requested fields are limited to `places.id,places.displayName,places.formattedAddress,places.googleMapsUri`; the name/address/map URI require **Text Search Pro**. Per Google's October 2026 pricing page, Text Search Pro has 5,000 free usage per SKU/month then USD 32 per 1,000 for the first paid tier; five would be around USD 0.16 at that tier, **not a statement of the account's current remaining free quota or bill**. Pricing changes and Google Cloud quotas may differ.
- If using the resulting Google Place data live in the product, adhere to mandatory Google logo/attribution and Google Map usage policies. The `place_id` can be retained for later refresh but **do not persist Google-provided names, descriptions, business status, address or coordinates as a permanent Fairwayd directory**. Verified business information from the provider's own site is a separate provenance stream.

Run from `apps/api`:

```powershell
node .\scripts\discover-ch-golf-services-places.mjs
# No API call

node .\scripts\discover-ch-golf-services-places.mjs --fetch --confirm-google-places-requests
# First 3 calls

node .\scripts\discover-ch-golf-services-places.mjs --fetch --confirm-google-places-requests --start=4 --max-requests=2
# Optional two more on same UTC date if the limit still permits
```

Keep the monetization feature flag disabled while piloting services. Cost visibility and supply-side coverage come before partner/referral monetization; revisit once the feature has genuine usage.
