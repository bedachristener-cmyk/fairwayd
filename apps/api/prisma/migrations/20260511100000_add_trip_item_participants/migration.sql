CREATE TABLE "TripItemParticipant" (
    "id" TEXT NOT NULL,
    "tripItemId" TEXT NOT NULL,
    "tripMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItemParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripItemParticipant_tripItemId_tripMemberId_key" ON "TripItemParticipant"("tripItemId", "tripMemberId");

CREATE INDEX "TripItemParticipant_tripMemberId_idx" ON "TripItemParticipant"("tripMemberId");

ALTER TABLE "TripItemParticipant" ADD CONSTRAINT "TripItemParticipant_tripItemId_fkey" FOREIGN KEY ("tripItemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripItemParticipant" ADD CONSTRAINT "TripItemParticipant_tripMemberId_fkey" FOREIGN KEY ("tripMemberId") REFERENCES "TripMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
