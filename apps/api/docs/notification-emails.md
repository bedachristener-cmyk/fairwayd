# Activity notification emails

Activity emails cover trip membership additions, incoming follow requests, accepted requests and new followers. Other in-app notifications do not send email. Sign-in, verification and password-reset emails remain independent.

## Preferences

`GET/PATCH /api/notifications/email-preferences` requires the signed-in user's JWT. PATCH accepts only boolean `emailTripNotifications` and `emailFollowNotifications` fields. Both default to enabled. The controls are under Privacy & Security → Email notifications.

Only events created after deployment can be queued; existing notification rows default to `emailPending=false`. An email is queued only when its category is enabled and the recipient has a verified email. Preferences and current membership/follow state are checked again before delivery. Opting in does not replay events created while opted out.

## Delivery

The notification row is the durable outbox. The API polls every 30 seconds, claims rows atomically with a five-minute lease, and retries up to five attempts. A stable Resend idempotency key (`notification/<id>`) protects retries against duplicates. Delivery errors are isolated from the original user action. Rows with five failed attempts remain available for diagnosis; they are not automatically retried indefinitely.

Required configuration:

- `RESEND_API_KEY`: existing Resend credential.
- `EMAIL_FROM` (or `SMTP_FROM`): a sender accepted by Resend.
- `FRONTEND_URL` (or `WEB_URL`): the frontend URL for this environment. Required for activity emails; no implicit production fallback.
- Optional `NOTIFICATION_EMAILS_ENABLED=false`: pauses activity email delivery for the service.

Stage and production must use their own frontend URL and sender configuration. Set production links to `https://www.fairwayd.golf` when production is provisioned. The login email logo also derives from the frontend configuration instead of a fixed Stage deployment.

## Verification

- API tests exercise preference validation, opt-out at event and delivery time, verified addresses, current relationship checks, concurrent claim loss, retry behaviour, provider errors, idempotency and HTML escaping.
- `apps/web/e2e/email-notifications.spec.ts` checks authenticated requests, independent switches, persistence after reload and failed saves at mobile and desktop widths, against mocked API responses.
- Migration rehearsed on an isolated copy of `fairwayd_stage`; existing notifications do not become queued emails.
- Live inbox delivery still requires a real new trip/follow event for a consenting verified recipient. A successful Resend API response is provider acceptance, not proof of inbox delivery.
