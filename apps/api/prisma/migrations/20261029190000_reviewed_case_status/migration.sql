-- Complete-post decisions close linked signals without a reusable content approval.
BEGIN;
ALTER TABLE "ContentModerationCase" DROP CONSTRAINT "ContentModerationCase_status_check";
ALTER TABLE "ContentModerationCase" ADD CONSTRAINT "ContentModerationCase_status_check"
  CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED', 'REVIEWED'));
COMMIT;
