# Fairwayd Trip Web Push — pilot runbook

Status: **implementation branch only**. Do not merge, deploy, or run migration on Prod without explicit owner approval.

## Configuration
- `TRIP_PUSH_EVENTS_ENABLED=false` by default. When true, creates in-app notifications for authorized trip item/document changes.
- `TRIP_PUSH_DELIVERY_ENABLED=false` by default. When true, sends Web Push only to opted-in users with device subscriptions.
- `WEB_PUSH_PUBLIC_KEY`: base64url uncompressed P-256 public key.
- `WEB_PUSH_PRIVATE_KEY`: matching base64url 32-byte private key. Backend secret only.
- `WEB_PUSH_SUBJECT`: a `mailto:` contact URL (for example `mailto:admin@yourdomain`).
- Use separate VAPID keys for Stage and Prod, and never commit the private key.
- Delivery permits only Google FCM, Mozilla Autopush, and Apple Web Push HTTPS hosts. Confirm the actual endpoint host on each pilot browser; extend this allowlist only after a security review.
- A feature flag does not substitute for schema migration. Apply the additive migration on a disposable test DB first.

## Pre-pilot gates
1. API `npm ci`, `npx prisma generate`, Jest recipient/crypto tests and `npm run build` pass.
2. Web `npm ci` and `npm run build` pass, including Workbox `importScripts`.
3. Confirm `PushSubscription` migration and new `User.pushTripNotifications` column in test DB.
4. Confirm disabled flags do not create new trip notifications or send any requests.
5. Verify GROUP, SELECTED and PRIVATE recipient sets, including VIEWER and guests.
6. Verify access revocation, deletion snapshots and no private title/notes/document names in payload.
7. Confirm push endpoint host allowlist and multi-account device behavior before production. Shared devices must not remain subscribed to a previous account; sign-out/device-switch behavior requires an explicit test.
8. Validate on a non-production HTTPS deployment with isolated data and opt-in test accounts.

## Device pilot
- iOS: install Fairwayd to Home Screen, launch installed PWA, log in, enable trip push from Notifications, accept permission.
- Android: open supported browser or installed PWA, log in, enable push, accept permission.
- With two test accounts, change a GROUP trip item and verify only the other account receives a push.
- Repeat for SELECTED, PRIVATE, update, delete, document upload/visibility/delete.
- Confirm tapping notification opens the trip, permissions persist after app restart, and disabling stops delivery.
- Test permission denial, offline delivery, expired subscription, sign-out and switching accounts on a shared device.
- Sign-out and account switch now detach the local subscription without disabling the preference on other devices. Confirm the old account receives no further push after switching; failed API removal must still unsubscribe the browser locally.
- Do not assume a green CI proves actual browser push delivery; a real device and isolated HTTPS API/database are mandatory for pilot acceptance.

## Release
- Keep PR draft until all gates are met.
- Obtain explicit approval before applying production migration, adding production VAPID secrets, enabling flags, merging or deploying.
- Rollback: disable `TRIP_PUSH_EVENTS_ENABLED` and `TRIP_PUSH_DELIVERY_ENABLED`; keep additive schema until separately reviewed.
