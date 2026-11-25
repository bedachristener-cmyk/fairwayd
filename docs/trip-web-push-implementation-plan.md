# Trip Web Push — implementation plan (2026-11-23)

Status: design in feature branch; NOT implemented, deployed, or enabled.
Source: prod branch. Stage database paused until quota reset. Production must not be altered without explicit release approval.

## Verified existing integration points
- `apps/api/prisma/schema.prisma`: `Notification` stores userId/type/title/body/link, with existing email queue; `User` has email preference flags. No push subscription model verified.
- `apps/api/src/notifications/notifications.service.ts`: `createNotification` creates in-app notifications and optionally queues emails. Extend without changing existing email behavior.
- `apps/api/src/notifications/notifications.controller.ts`: JWT-authenticated notification endpoints; natural location for subscription and preference endpoints.
- `apps/api/src/trips/trips.service.ts`: `createItem`, trip membership, item visibility checks, and existing member notifications. `visibleTripItemWhereForMember` and `visibleTripDocumentWhereForMember` enforce per-member visibility.
- `apps/web/vite.config.ts`: vite-plugin-pwa, generated Workbox service worker; push event handler must be integrated with the existing worker, not registered as a conflicting second worker.

## Required recipient rules
- Authenticated current trip members only; no guest without account/device subscription.
- Exclude the actor.
- For item `GROUP`, notify eligible trip members; `SELECTED`, only selected authorized members; `PRIVATE`, only owner/creator where current API access permits. Use the existing server-side visibility predicate, not client-supplied recipient IDs.
- On visibility changes, notify only users who can access the item *after* the change. Newly authorized members may receive an update. Do not leak formerly private titles/content to newly unauthorized users.
- For document changes, independently check document visibility and linked-item visibility. A document's recipients must satisfy both where relevant.
- Deletion events require a before-delete authorized-recipient snapshot and safe generic message, because the item is no longer readable afterward.
- Check trip membership/visibility again at dispatch time; remove stale subscriptions. Never place private data in a payload without verifying access.
- Suppress notifications for no-op updates and bulk imports unless explicitly intended.

## Delivery architecture
1. Introduce `PushSubscription` linked to User (endpoint unique, p256dh/auth keys, createdAt/updatedAt, failure counters), and user opt-in preference `pushTripNotifications` default false. Add an additive Prisma migration; do not migrate prod DB during development.
2. VAPID public key exposed to authenticated clients; private key stored only as Railway backend secret. No keys in repository.
3. Authenticated subscribe/unsubscribe/preferences API with strict payload validation, user-bound ownership, and idempotent endpoint upsert.
4. PWA UI: explicit enable button from a user gesture, explain iOS home-screen installation and permission, allow disabling; handle unsupported browsers.
5. Integrate `push` and `notificationclick` handlers into the existing vite-plugin-pwa service worker using supported injectManifest or compatible worker extension; preserve caching/offline behavior.
6. Use a maintained Web Push implementation server-side. Dispatch asynchronously, cap retries, delete invalid/expired endpoints (404/410), and do not fail trip mutations because of push errors.
7. Generate in-app notification + push job for create/update/delete item and relevant document changes, with deduplication, idempotency, and safe navigation links.
8. Feature flag default OFF for production until explicit approval; no sends or subscriptions before enabled.

## Verification / release gates
- Unit tests: GROUP/SELECTED/PRIVATE, actor excluded, removed member, newly granted/revoked visibility, document-item intersection, deletion, duplicate events, opt-out.
- Integration tests: authenticated subscribe/unsubscribe, user isolation, no cross-trip disclosure, VAPID config missing, stale subscription cleanup.
- PWA tests: Android Chrome, iOS Safari installed-to-home-screen, app foreground/background, tap opens correct trip/item, denied permission, existing offline caching.
- Build/typecheck/lint and review migration; release branch -> PR to prod. Migration backup and rollback plan; only then enable on a small opt-in pilot group.
- After Neon Stage quota reset, synchronize the exact tested code and schema migrations to Stage and validate there.

## Open implementation details to inspect before code changes
- Exact trip item and document mutation methods and their existing notification/activity hooks.
- Current UI routing and notification settings components.
- Workbox integration mechanism and existing service-worker registration.
- Background job/worker infrastructure and deployment constraints.
