CREATE TYPE "TripItemVisibility" AS ENUM ('PRIVATE', 'SELECTED', 'GROUP');

ALTER TABLE "TripItem" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "TripItem" ADD COLUMN "visibility" "TripItemVisibility" NOT NULL DEFAULT 'GROUP';

UPDATE "TripItem" AS item
SET "createdByUserId" = COALESCE(
  (
    SELECT member."userId"
    FROM "TripMember" AS member
    WHERE member."tripId" = item."tripId"
      AND member."userId" IS NOT NULL
      AND member."role" IN ('OWNER', 'ADMIN')
    ORDER BY
      CASE member."role" WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
      member."createdAt" ASC
    LIMIT 1
  ),
  (
    SELECT trip."createdById"
    FROM "Trip" AS trip
    WHERE trip."id" = item."tripId"
  ),
  (
    SELECT member."userId"
    FROM "TripMember" AS member
    WHERE member."tripId" = item."tripId"
      AND member."userId" IS NOT NULL
    ORDER BY member."createdAt" ASC
    LIMIT 1
  )
);

ALTER TABLE "TripItem" ALTER COLUMN "createdByUserId" SET NOT NULL;

CREATE TABLE "TripItemVisibilityMember" (
    "id" TEXT NOT NULL,
    "tripItemId" TEXT NOT NULL,
    "tripMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItemVisibilityMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripItemVisibilityMember_tripItemId_tripMemberId_key" ON "TripItemVisibilityMember"("tripItemId", "tripMemberId");
CREATE INDEX "TripItemVisibilityMember_tripMemberId_idx" ON "TripItemVisibilityMember"("tripMemberId");
CREATE INDEX "TripItem_createdByUserId_idx" ON "TripItem"("createdByUserId");
CREATE INDEX "TripItem_visibility_idx" ON "TripItem"("visibility");

ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripItemVisibilityMember" ADD CONSTRAINT "TripItemVisibilityMember_tripItemId_fkey" FOREIGN KEY ("tripItemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripItemVisibilityMember" ADD CONSTRAINT "TripItemVisibilityMember_tripMemberId_fkey" FOREIGN KEY ("tripMemberId") REFERENCES "TripMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;