# Country entry guides and linked trips

Prepared 30 October 2026. Stage only. Country content is maintained once in Explore and read live when a trip is opened/refreshed. It is not copied into each trip and is not a visa application service.

## User flow

- Explore → country → Entry & visas. All readers see published guides. Admins can edit translated title/text, official link, source link and verification date, add/remove entries, and publish/unpublish.
- New trip → optional “Include entry requirements?” → select one or more countries that have published guides in active Explore destinations.
- Existing trip → Edit Trip → same selector. Selecting none explicitly stores `[]` and removes linked guides. Ordinary trip members read the shared selections; only existing OWNER/ADMIN trip editors can save them. Spectators still have no Before you go section.
- Before you go displays selected countries' current published guides, their source links and verification dates, plus a link to Explore. The personal Visa/eVisa checkbox remains separate and local.
- Existing trips receive a nullable JSON field. NULL preserves the earlier Thailand-only inference from title/destination/course country; no existing trip row is rewritten. New trips explicitly store an array and do not infer/import countries automatically. On editing a legacy trip, its displayed Thailand selection becomes an explicit setting.
- If a selected guide is unpublished or its Explore country deactivated, the trip shows an unavailable-information message. Editing displays the unavailable selection so it can be removed; the server refuses newly saved unavailable selections. It does not silently substitute another country's requirements.

## Initial countries

Only **TH, PH and VN** are initially published. These are existing Explore destinations. Malaysia, Indonesia, Singapore and Cambodia have not been added to Explore or seeded by this change. Admins can create guides on any other existing active Explore country after checking official sources.

- Thailand: official TDAC FAQ, https://tdac.immigration.go.th/manual/en/faq.html ; e-Visa, https://www.thaievisa.go.th/ . Within the three-day arrival window including arrival day; no departure-date rule. TDAC is separate from a visa.
- Philippines: official eTravel FAQ, https://www.etravel.gov.ph/frequently-asked-questions ; Immigration Bureau, https://immigration.gov.ph/ . Free arrival registration/update with exemptions. The FAQ says within 72 hours, but the Bureau's October advisory https://immigration.gov.ph/advisory-etravel-registration/ says “at least 72 hours”. Because those formulations conflict, the seeded copy directs travellers to the portal for the window rather than claiming one harmonised deadline. It does not incorrectly require foreign visitors to file an outbound declaration in all cases.
- Vietnam: https://evisa.gov.vn/ and https://prearrival.immigration.gov.vn/ . The ministry's 13 May 2026 report https://en.mps.gov.vn/article/immigration-department-launches-pre-arrival-information-system-1778670404 describes an optional pilot at Tan Son Nhat, not a nationwide obligation. The guide states the date and uncertainty explicitly. No uniform visa-free duration is inferred from the travel group's residence in Switzerland.

All three verification dates are 2026-10-30. Translations exist in DE/FR/IT/EN; missing translations in later admin edits fall back to English. “Last checked” is manually confirmed by an admin after source review, not automatically advanced when a trip opens.

## Storage and boundaries

Additive migration `20261030100000_country_entry_guides` adds CountryEntryGuide and nullable Trip.entryRequirementCountries. Initial source-reviewed texts are seeded in that migration; later deploys do not overwrite admin changes. The per-guide integer version makes concurrent edits conflict rather than silently overwrite each other. Only an authenticated server-resolved admin may read drafts or write; no role supplied in a request body is trusted.

Public GET /entry-guides returns published entries for active Explore destinations and uses no-store. PATCH /entry-guides/:countryCode and GET /entry-guides/:countryCode/admin require JWT and AdminGuard. Text is rendered as plain React text; URLs must be HTTPS, without credentials. No server fetch of admin-supplied URLs occurs. The administrator is responsible for verifying that links lead to official sources; HTTPS alone does not certify an authority. Maximum eight entries per country and eight selected countries per trip. A guide must have English title/text; DE/FR/IT are optional. The account performing the edit is recorded internally and is not returned in the public guide DTO.

## Validation

- API unit/HTTP boundary: non-admin denied; request-body identity ignored; malformed/unsafe content and dates rejected; optimistic version conflicts; selection validation.
- Isolated PostgreSQL CI: additive migration/seed data, selected-country persistence, central edits without trip rewrite, stale-edit conflict, explicit opt-out and legacy NULL; unauthorized trip updates denied.
- Browser: country content in Explore, admin editing vs ordinary reader; optional multi-country selection on create and edit, persistence across reload, central updates visible in a linked trip, explicit removal, unchanged spectator/personal-checklist boundaries, mobile/desktop overflow and screenshots.

No binding legal-version activation, production release, automatic reminder, visa eligibility engine or live scraping is part of this change.
