-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "holes" INTEGER,
ADD COLUMN     "location" geography(Point,4326),
ADD COLUMN     "osmId" TEXT,
ADD COLUMN     "par" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'csv',
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE INDEX "Course_location_idx" ON "Course" USING GIST ("location");
