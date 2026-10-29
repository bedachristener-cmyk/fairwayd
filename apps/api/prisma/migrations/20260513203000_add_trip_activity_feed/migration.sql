CREATE TYPE "TripActivityType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'ITEM_CREATED', 'ITEM_UPDATED', 'ITEM_DELETED', 'MEMBER_ADDED', 'INVITE_CREATED', 'TRIP_UPDATED');

CREATE TABLE "TripActivity" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "type" "TripActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripActivity_tripId_createdAt_idx" ON "TripActivity"("tripId", "createdAt");
CREATE INDEX "TripActivity_actorUserId_idx" ON "TripActivity"("actorUserId");
CREATE INDEX "TripActivity_type_idx" ON "TripActivity"("type");

ALTER TABLE "TripActivity" ADD CONSTRAINT "TripActivity_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripActivity" ADD CONSTRAINT "TripActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
