CREATE TYPE "TripDocumentCategory" AS ENUM ('FLIGHT', 'HOTEL', 'GOLF', 'TRANSFER', 'VISA', 'GENERAL');

CREATE TABLE "TripDocument" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" "TripDocumentCategory" NOT NULL DEFAULT 'GENERAL',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripDocument_tripId_idx" ON "TripDocument"("tripId");
CREATE INDEX "TripDocument_uploadedByUserId_idx" ON "TripDocument"("uploadedByUserId");
CREATE INDEX "TripDocument_category_idx" ON "TripDocument"("category");

ALTER TABLE "TripDocument" ADD CONSTRAINT "TripDocument_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripDocument" ADD CONSTRAINT "TripDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
