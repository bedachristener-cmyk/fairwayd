CREATE TYPE "CourseSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CourseSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "website" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "holes" INTEGER,
    "par" INTEGER,
    "notes" TEXT,
    "imageUrl" TEXT,
    "status" "CourseSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseSubmission_status_idx" ON "CourseSubmission"("status");
CREATE INDEX "CourseSubmission_country_idx" ON "CourseSubmission"("country");
CREATE INDEX "CourseSubmission_submittedByUserId_idx" ON "CourseSubmission"("submittedByUserId");

ALTER TABLE "CourseSubmission" ADD CONSTRAINT "CourseSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
