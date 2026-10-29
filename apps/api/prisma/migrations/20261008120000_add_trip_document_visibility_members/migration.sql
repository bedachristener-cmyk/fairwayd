ALTER TYPE "TripDocumentVisibility" ADD VALUE IF NOT EXISTS 'SELECTED';

CREATE TABLE "TripDocumentVisibilityMember" (
    "id" TEXT NOT NULL,
    "tripDocumentId" TEXT NOT NULL,
    "tripMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripDocumentVisibilityMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripDocumentVisibilityMember_tripDocumentId_tripMemberId_key"
ON "TripDocumentVisibilityMember"("tripDocumentId", "tripMemberId");

CREATE INDEX "TripDocumentVisibilityMember_tripMemberId_idx"
ON "TripDocumentVisibilityMember"("tripMemberId");

ALTER TABLE "TripDocumentVisibilityMember"
ADD CONSTRAINT "TripDocumentVisibilityMember_tripDocumentId_fkey"
FOREIGN KEY ("tripDocumentId") REFERENCES "TripDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripDocumentVisibilityMember"
ADD CONSTRAINT "TripDocumentVisibilityMember_tripMemberId_fkey"
FOREIGN KEY ("tripMemberId") REFERENCES "TripMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
