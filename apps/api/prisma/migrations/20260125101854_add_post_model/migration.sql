-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lon" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Post_lat_lon_idx" ON "Post"("lat", "lon");
