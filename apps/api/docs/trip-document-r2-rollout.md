# Protected Trip document storage rollout

Trip documents must use a dedicated private R2 bucket. Public posts, avatars,
course-submission images, and Trip cover images continue using `R2_BUCKET` and
the existing public delivery base; do not disable public access on that shared
bucket as part of this rollout.

## Configuration

Set these backend-only Railway variables for each environment:

- `R2_ENDPOINT`: existing account S3 endpoint.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`: credentials with access to
  both buckets (or equivalent scoped credentials if the deployment supports
  separate permissions).
- `R2_BUCKET`: existing bucket used by intentionally public media.
- `R2_PUBLIC_BASE_URL`: public delivery base for `R2_BUCKET`. Existing
  `R2_PUBLIC_URL` remains a backward-compatible alias for public uploads.
- `R2_PRIVATE_DOCUMENT_BUCKET`: dedicated private Trip-document bucket name.
- `R2_LEGACY_PUBLIC_BASE_URL`: exact base URL from which the historical public
  Trip document objects can be read during migration. It must not point at an
  arbitrary host.
- `R2_ALLOW_LEGACY_SHARED_TRIP_DOCUMENT_READS=true`: temporary, explicit
  compatibility switch for old `r2://trips/...` / `trips/...` records that
  still point into the shared bucket. Do not enable this on a steady-state
  deployment; remove it after migration.

No R2 credentials belong in web/Vite configuration. The private bucket must
have public `r2.dev` access disabled and no public custom domain or public
read policy. The application serves documents only through the authenticated
Trip download endpoint after its visibility check.

## Stage rollout

1. In Cloudflare, create a dedicated bucket with a purpose/name such as
   `fairwayd-trip-documents-stage`. Keep public development URL access disabled.
2. Grant the backend R2 credentials object read/write access to the existing
   public bucket and the new private bucket. Set the backend variables above.
3. Set the temporary legacy-read switch and deploy this application version.
   Existing absolute URLs remain readable only through the authenticated
   endpoint; old shared-bucket `r2://trips/...` references remain readable only
   while the explicit switch is enabled. New Trip uploads fail closed if the
   private bucket configuration is absent and otherwise go only to the private
   bucket using the `private-trip-documents/` key namespace.
4. Verify a newly uploaded document is stored in the private bucket and can be
   downloaded by an authorized member, while an unauthorized member receives
   404. Verify a post image/avatar still uses the existing public delivery path.
5. Run `npx ts-node scripts/migrate-trip-documents-to-private-r2.ts --dry-run`
   in `apps/api`. Confirm the count/IDs with the operator's inventory.
6. Run `npx ts-node scripts/migrate-trip-documents-to-private-r2.ts --apply`.
   It copies to deterministic keys, reads each copy back and verifies SHA-256
   and length, then conditionally updates only the document's `fileUrl`. It
   It includes absolute legacy URLs and old shared-bucket `r2://trips/...`
   references, preserves document IDs, uploader, visibility, selected members,
   names, and metadata, and skips already-private key references. It is
   resumable; failed records can be rerun. Source objects are never deleted by
   the script.
7. Remove `R2_ALLOW_LEGACY_SHARED_TRIP_DOCUMENT_READS` and redeploy/restart.
   Verify every migrated record through Fairwayd authorization (including
   private/selected denial cases) and confirm all document references are
   `r2://` private references. Inspect failed IDs and rerun as needed.
8. Only after application verification, remove the old public objects using a
   separately reviewed, explicit Cloudflare cleanup. Verify each old URL no
   longer returns content. Do not remove sources during the first migration.
9. Repeat with a separate private bucket/name and environment values for
   Production before production document uploads are enabled.

## Residual exposure / cleanup

Until all historical public objects are removed (and verified unavailable),
anyone who already knows an old public URL can continue fetching that object
directly, bypassing Fairwayd. Moving a database reference does not revoke the
old URL. The previous Stage check identified nine such records (five SHARED,
four PRIVATE); repository code cannot revoke their existing Cloudflare public
objects or disable the shared bucket's `r2.dev` endpoint without breaking the
other intentionally public media. Treat old-object removal and URL verification
as a required security release gate.
