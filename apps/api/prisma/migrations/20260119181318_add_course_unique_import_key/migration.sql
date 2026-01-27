/*
  Warnings:

  - You are about to drop the column `address` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `holes` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `par` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Course` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[country,name,lat,lon]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lat` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Made the column `country` on table `Course` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "address",
DROP COLUMN "holes",
DROP COLUMN "isPublic",
DROP COLUMN "location",
DROP COLUMN "par",
DROP COLUMN "website",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lon" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "postalCode" TEXT,
ALTER COLUMN "country" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Course_country_idx" ON "Course"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Course_country_name_lat_lon_key" ON "Course"("country", "name", "lat", "lon");
