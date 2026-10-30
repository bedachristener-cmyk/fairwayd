# Device access: location and photo actions

Stage implementation, 30 October 2026. No terms-version activation or production configuration change.

- `useLocationAccess` is the sole caller of `getCurrentPosition`. No mount effect, sidebar, background task, permission-state probe or `watchPosition` reads location. This remains true for a browser that already granted location permission.
- Map and Near Me start from a default/manual area. The explicit location button first explains purpose and allows cancellation. Confirmation starts a single request, followed by the platform permission dialog if required. Repeated requests within that mounted feature reuse the purpose acknowledgement, not a stored platform grant. The platform still enforces current access. No acknowledgement or coordinates are persisted by the hook.
- Denial, timeout, unsupported devices and unavailable/invalid coordinates have DE/FR/IT/EN messages. The map/search remain available. A failed request does not move the search area. Coordinates are not read after leaving the feature; pending callbacks are ignored on unmount.
- Near Me sends coordinates and radius when a search is run. Existing map viewport persistence can store a map centre in browser storage. External tile providers receive requests for viewed areas. This is not a promise that request logs or all providers have no retention; the separate provider/retention checklist still applies.
- The feed’s camera button first explains the photo action. Confirmation synchronously activates the existing `input type=file capture=environment` inside the user’s click. The OS/browser controls the camera or picker and any required permission. Cancel does not activate it. An existing-image alternative uses the separate gallery input. No `getUserMedia`, microphone access, continuous stream or full-library API is introduced. Other image/document inputs continue to use the platform picker and user-selected files.
- Privacy & security contains device-access help and revocation instructions. It deliberately does not claim an app switch can revoke browser/OS permissions. Existing system grants may be remembered. This permission flow is separate from AGB acceptance.
- The unused legacy MapView is also explicit-only. Sidebar map previews use the saved/manual area, not a new location read.

## Verification

Browser regression coverage (390/1280 px, browser and simulated standalone PWA) spies on sensor calls: no startup/sidebar reads even with a granted-permission mock; rationale cancellation; confirmed single requests; denial/timeout/missing capability fallback; direct camera cancellation/confirmation and existing-file selection without publishing. Native camera hardware and the appearance of platform permission dialogs remain controlled by the actual device.

Reader privacy drafts DE/FR/IT/EN describe these flows. Previously accepted v1 remains byte/semantic-equivalent; no new acceptance or age gate is activated.
