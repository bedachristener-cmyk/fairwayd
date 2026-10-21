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
