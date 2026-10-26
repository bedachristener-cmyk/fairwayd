# Fairwayd V1.0 — UI Vision / Promo Video Alignment

Status: DESIGN BASELINE (not an implementation or a deployment)
Reference: `Fairwayd_Reel_V2_Pop_Edit.mp4` (24 s, provided by the product owner on 2026-10-26)
Target: make the real working Fairwayd interface visually match the promo-video screens as closely as practical, *not* retrofit the promo to today's UI.

## Approved direction

- Brand language is under creative review: **Connect** is essential because Fairwayd connects golfers. Proposed full sequence: **Discover. Find. Connect. Inspire.**; **Plan** remains an explicit key product capability and prominent Trip/itinerary section. Do not finalize marketing wording without owner approval. Earlier video variants say Discover / Plan / Connect and Discover / Find / Inspire; preserve the underlying functions while harmonizing all UI labels.
- Premium golf/travel visual language: deep forest/emerald, warm cream/light card surfaces, restrained golf-gold accents, image-led destination/golf cards, clear typography, subtle motion and layered card composition.
- Mobile-first (9:16 phone UI), fully usable on desktop and in PWA.
- Match the **specific UI composition** seen in the reel, not merely its color palette.
- No regression in existing behaviors, data, authorization, trip calculations, documents, cost allocation, currencies or membership flows.
- UI imagery is illustrative: no invented courses, prices, member counts, or bookings presented as live user data.

## Video reference frames and product mapping

Frame times are measured in seconds from the start of the *24-second V2 Pop Edit*. When the original promo asset is available to implementers, use these exact seek points.

| Time | Video screen / visual characteristics | Real implementation target |
|---|---|---|
| 00:02 | Intro: huge golf imagery, layered phone mock, golden pill CTA, cream/forest contrast | Landing / entry hero; responsive without forced mock frame |
| 00:05 | **Discover**: visually rich course/destination cards; card group labelled Explore / Find / Inspire | Course discovery/search and Explore cards |
| 00:08–00:11 | **Plan Golf Trips**: phone with trip itinerary, grouped golf/travel/budgets, cream list cards on branded background | Trips list, Trip Details, day-by-day Trail, golf/transfer/hotel entries and expense summaries |
| 00:14 | **Connect**: existing *original* “Connect with Golfers” frame differs materially in visual quality and language from other concept UI screens. **Reference for functionality only — not visual target.** | Rebuild Friends / requests / following / followers in the premium emerald, cream, gold and photo-led language of other reel screens; keep functional connections intact |
| 00:17 | **Share Your Golf Journey**: cream overlaid cards on imagery, community focus | Feed, post cards, profile/community |
| 00:20–00:23 | Outro: large landscape, phone mock, vivid yellow CTA | Landing / campaigns (actual app should not imitate a static trailer overlay) |

The app's **existing Trip Trail with Golf and Transfer** is an established implementation starting point. Do not replace it or discard its functional behaviors; compare its components with the reference and align the visual shell.

## Recommended delivery slices

### UI-01 — Trip screens (first implementation scope)
- Gather screenshots for Stage mobile 390×844 and desktop 1440×900 from existing Trips list, Trip Details and Trail.
- Identify real components/sections in `apps/web/src/pages/TripsPage.tsx` and `apps/web/src/pages/TripDetailPage.tsx`.
- Align trip header, imagery, grouped itinerary/trail cards, status chips, quick summary and action hierarchy to the 00:08–00:11 reference.
- Retain **Golf / Transfer / Hotel / other** item discrimination, editing, documents visibility, membership selection, existing costs/per-person and currency semantics.
- Make no API or DB changes for styling alone.
- Deliver screenshots and a before/after checklist on feature branch for owner review.

### UI-02 — Discover / Find
- Course search, result cards, map and destination views matching the visual weight and rounded image-led card patterns of 00:05.
- Keep filters, back navigation, results and course links intact.

### UI-03 — Connect & Inspire / Community
- **Do not visually copy the original 00:14 “Connect with Golfers” screen.** Design a replacement matching the premium look of the other promo screens while retaining genuine Friends, follow requests and follower/following interactions.
- Feed visual alignment (00:17) with existing relationships, privacy and post interactions intact.
- Product review gate: compare a new premium Connect mockup against Discover and Trips; consistent composition is a priority.

### UI-04 — Navigation and cross-app system
- Centralized design tokens for color, spacing, typography, radii, shadows and motion.
- Apply across responsive navigation, profile/settings and auxiliary pages after key public flows are validated.

## Design token *direction*, not final measurements

Use existing app tokens where appropriate and introduce cohesive aliases after examining the actual styles, rather than wholesale replacements:
- Deep forest: dark green/teal navigation and emphasis surfaces.
- Warm light cards: cream, readable foreground and dark text.
- Golf gold: CTA and sparse highlight only, not general body text.
- Nature imagery: visually dominant but with safe contrast and predictable aspect ratio.
- Cards: consistently rounded, restrained depth, ample tappable areas.
- Motion: purposeful, optional with reduced-motion support, never masks content or replaces functional state.

## Acceptance criteria for each slice

1. Screenshots of the exact corresponding promo frame and the real Stage page at mobile **and** desktop sizes.
2. Match layout hierarchy, colors, card anatomy, typography and visual rhythm; document necessary deviations where the video is a noninteractive mockup.
3. All existing controls operational and keyboard accessible; dark/light theme and PWA support retained.
4. Existing automated checks/build pass; targeted UI tests for modified flows where feasible.
5. No changes to Production (Prod does not yet exist); feature branch -> reviewed PR -> Stage.
6. Explicit owner visual sign-off before starting the next slice.

## Infrastructure decision (recorded, deferred)

V1.0 Production will be provisioned later as separate Railway, Vercel, Neon database and R2 storage from Stage. Initial one-time migration of approved Stage data into Prod; afterwards no automatic database/data sync. No Prod provisioning or data copy belongs to UI-01.

## Immediate next technical task

Create **UI-01A** as a small scoped front-end PR: first inspect and compare the `TripsPage.tsx`, relevant regions of `TripDetailPage.tsx`, and existing stylesheet/design tokens against promo frames 00:08 and 00:11; then implement only the trip-list/overview visual shell before considering changes to the large interactive editor/trail.
