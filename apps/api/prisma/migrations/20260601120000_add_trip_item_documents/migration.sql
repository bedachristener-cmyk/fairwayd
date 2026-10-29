-- Link existing trip documents to zero or more trip items without duplicating files.
CREATE TABLE "TripItemDocument" (
    "id" TEXT NOT NULL,
    "tripItemId" TEXT NOT NULL,
    "tripDocumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItemDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripItemDocument_tripItemId_tripDocumentId_key" ON "TripItemDocument"("tripItemId", "tripDocumentId");
CREATE INDEX "TripItemDocument_tripDocumentId_idx" ON "TripItemDocument"("tripDocumentId");

ALTER TABLE "TripItemDocument" ADD CONSTRAINT "TripItemDocument_tripItemId_fkey" FOREIGN KEY ("tripItemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripItemDocument" ADD CONSTRAINT "TripItemDocument_tripDocumentId_fkey" FOREIGN KEY ("tripDocumentId") REFERENCES "TripDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
