# Golf Near Me – AI-generated category artwork

## Intent

Each offering category uses a **generic, original AI-generated image** as a decorative card header. The artwork is **not a photo of the venue** and must not be presented as such.

| Golf Near Me | Local asset | Source image |
| --- | --- | --- |
| Simulatoren | `simulator.webp` | AI image #1: indoor golf simulator |
| Golfplätze | `course.webp` | AI image #2: golf-course landscape |
| Driving Ranges | `range.webp` | AI image #3: premium driving range |
| Golfunterricht & Pros | `academy.webp` | AI image #4: instruction |
| Golfshops | `shop.webp` | AI image #5: equipment showroom |
| Schläger-Fitting | `fitting.webp` | AI image #6: fitting studio |

Images: 1440 × 480 px, WebP, approximately 330 KB *combined*. All were generated for the Fairwayd design, with no third-party websites, logos, or brand-licensed photos used as image sources.

## Integration

The category image map and dark readability overlay are defined in
`apps/web/src/pages/GolfNearMePage.tsx`. The image references resolve from
`apps/web/public/golf-near-me/categories/`.

The six WebP image files **are committed to `feature/golf-near-me-ch-pilot`** in commit `c1c417f9eeaaae58224f750ccf3a96fa75c0a0a7` (2026-10-23). GitHub was checked independently: all six files are present under `apps/web/public/golf-near-me/categories/`. They were transferred and committed from the developer's local workstation because the GitHub connector only writes UTF-8 files. Stage and Production have not been deployed.

Example PowerShell (Windows, from the correct feature branch, assuming the asset archive is in Downloads):

```powershell
cd C:\dev\fairwayd
git branch --show-current
git pull --ff-only
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\fairwayd-golf-near-me-category-images.zip" -DestinationPath "C:\dev\fairwayd" -Force

cd .\apps\web
node .\scripts\check-golf-near-me-artwork.mjs
npm run build
```

**Already completed on 2026-10-23:** The six WebP files were committed and pushed to `feature/golf-near-me-ch-pilot`. The following commands record the completed procedure:

```powershell
cd C:\dev\fairwayd
git add apps/web/public/golf-near-me/categories/*.webp
git commit -m "assets(golf-near-me): add optimized AI category header imagery"
git push origin feature/golf-near-me-ch-pilot
```

Do not publish to `stage`/Production until separately approved.

## Rendering / accessibility

- An opaque solid dark-green fallback remains behind the image if the asset fails to load.
- A left-to-right dark overlay keeps white venue titles and subtitle readable, including on mobile.
- Images are decorative and use CSS backgrounds on `aria-hidden` areas, not claims about the physical premises.
- Venues offering multiple services show the selected/priority category's visual only; all offerings remain in the details and category chips.
- Existing `Course` cards may use the generic course image; this does not change `Course` identities or markers.

## Release QA

1. Verify all six files with `node apps/web/scripts/check-golf-near-me-artwork.mjs` (when run from repo root).
2. Run the frontend build and visually check The Golf Lounge (Simulatoren, Alles, SHOP) in the isolated browser-test environment.
3. Confirm small-screen crop, overlay contrast, caching, and image loading.
4. No database/API changes or imports are part of this artwork-only change. Stage and Production are excluded.
