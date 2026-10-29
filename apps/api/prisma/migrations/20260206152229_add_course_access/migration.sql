-- CreateEnum
CREATE TYPE "CourseAccess" AS ENUM ('PUBLIC', 'PRIVATE', 'RESORT', 'MUNICIPAL', 'SEMI_PRIVATE');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "access" "CourseAccess";

-- CreateIndex
CREATE INDEX "Course_country_region_idx" ON "Course"("country", "region");

-- CreateIndex
CREATE INDEX "Course_city_idx" ON "Course"("city");

-- CreateIndex
CREATE INDEX "Course_access_idx" ON "Course"("access");

-- CreateIndex
CREATE INDEX "Course_holes_idx" ON "Course"("holes");
