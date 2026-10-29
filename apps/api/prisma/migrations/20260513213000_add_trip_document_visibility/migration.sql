CREATE TYPE "TripDocumentVisibility" AS ENUM ('SHARED', 'PRIVATE');

ALTER TABLE "TripDocument" ADD COLUMN "visibility" "TripDocumentVisibility" NOT NULL DEFAULT 'SHARED';

CREATE INDEX "TripDocument_visibility_idx" ON "TripDocument"("visibility");
