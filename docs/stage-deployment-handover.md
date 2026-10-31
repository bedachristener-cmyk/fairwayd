# Stage deployment handover

Scope: Railway service `fairwayd-stage` (`c11e6e17-8fea-40b6-9380-f56a44e9a28d`),
project `181596d5-dda7-4f1e-b7ba-357fbe1b8bab`, environment
`061ae3c8-a715-493e-9e77-b14786f1feac`. The environment is named `production`
but also contains the separate legacy Prod service. Never apply these settings
to that other service implicitly.

## Intended Railway configuration

| Setting | Value |
| --- | --- |
| Source branch / root | `stage` / `apps/api` |
| Pre-deploy command | `node scripts/assert-stage-golf-database.mjs && npx prisma migrate deploy` |
| Pre-deploy timeout | 300 seconds |
| Start command | `node dist/src/main.js` |
| Healthcheck path / timeout | `/api/ready` / 180 seconds |
| Overlap | 15 seconds |
| Draining | 30 seconds |

The existing exact Stage database identity and TLS guard remains before Prisma
migrations. Moving it and migrations into pre-deploy avoids running npm or
Prisma as the long-lived server process. No new schema migration is included.
Migrations still need compatibility with the old and new API during overlap.
The existing `npm run start:prod` remains unchanged for other environments.

`/api/health` retains its stable liveness response. `/api/ready` performs a
read-only `SELECT 1`, waits at most 1.5 seconds per request, and reports 503
without database error details if it cannot serve traffic. A still-pending
database check is reused rather than creating queries for every probe. The
response is not cacheable and exposes only a non-secret Railway deployment ID
alongside `status: ok` so external probes can verify a real cutover.

SIGTERM/SIGINT mark the process as draining, stop accepting new HTTP connections,
and wait for active HTTP requests before calling Nest's close hooks (including
Prisma disconnect). Repeated stop signals do not bypass that drain. A 25-second
deadline force-closes remaining HTTP connections and exits with failure before
Railway's 30-second forced-stop boundary. No unbounded completion guarantee is
made for long uploads, streaming connections or background provider operations.
Existing durable notification claims/retries remain unchanged.

## Validation

Local/CI checks cover DB success/failure/timeout, shutdown during an outstanding
readiness query, reuse of slow DB checks, stable liveness, Stage DB identity
rejection, and real child-process SIGTERM with an active keep-alive HTTP request.
Another real process test verifies the deadline for a hanging request.

For live validation, first deploy the new code/config. The previous version does
not yet have the shutdown handler, so that initial transition is not proof of
draining from a handler-enabled process. Then redeploy the same successful build
while the read-only probe runs:

```sh
node scripts/probe-stage-rollout.mjs --seconds=600 --out=/tmp/stage-rollout.jsonl
```

The probe is fixed to the Stage origin and requests liveness, readiness and a
bounded database-backed course search once per second. It stores timestamps,
status codes, latency and deployment IDs, never course bodies or user tokens.
Verify both old/new deployment IDs and successful requests before and after
cutover, then inspect bounded shutdown logs for the previous process. Record
observed failures and latency rather than claiming universal zero downtime.

This does not provide multiple-instance failover for an unexpected crash, protect
against database/provider/network outages, or monitor readiness continuously on
Railway's behalf. A separate external uptime monitor remains a Prod prerequisite.

Sources: [Railway healthchecks](https://docs.railway.com/deployments/healthchecks),
[deployment teardown](https://docs.railway.com/deployments/deployment-teardown),
[Node SIGTERM handling](https://docs.railway.com/deployments/troubleshooting/nodejs-sigterm-handling).
