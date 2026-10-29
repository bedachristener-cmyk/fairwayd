/*
  Warnings:

  - Made the column `isPublic` on table `Course` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Course_country_idx";

-- DropIndex
DROP INDEX "Course_location_gist_idx";

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "isPublic" SET NOT NULL,
ALTER COLUMN "isPublic" SET DEFAULT true;
