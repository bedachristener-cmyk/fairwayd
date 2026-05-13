CREATE TABLE "TripInvite" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TripInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripInvite_token_key" ON "TripInvite"("token");
CREATE INDEX "TripInvite_tripId_idx" ON "TripInvite"("tripId");
CREATE INDEX "TripInvite_createdByUserId_idx" ON "TripInvite"("createdByUserId");
CREATE INDEX "TripInvite_revokedAt_idx" ON "TripInvite"("revokedAt");

ALTER TABLE "TripInvite" ADD CONSTRAINT "TripInvite_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripInvite" ADD CONSTRAINT "TripInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
