/*
  Warnings:

  - You are about to drop the column `holesText` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `ratingAvg` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `course_import` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterEnum
ALTER TYPE "CourseAccess" ADD VALUE 'MUNICIPAL';

-- DropIndex
DROP INDEX "Course_holesText_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "holesText",
DROP COLUMN "ratingAvg",
DROP COLUMN "ratingCount";

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "status" "FollowStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "course_import";

-- CreateIndex
CREATE INDEX "Follow_followingId_status_idx" ON "Follow"("followingId", "status");
