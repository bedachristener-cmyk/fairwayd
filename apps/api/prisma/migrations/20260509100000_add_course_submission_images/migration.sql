CREATE TABLE "CourseSubmissionImage" (
    "id" TEXT NOT NULL,
    "courseSubmissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSubmissionImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseSubmissionImage_courseSubmissionId_idx" ON "CourseSubmissionImage"("courseSubmissionId");

ALTER TABLE "CourseSubmissionImage" ADD CONSTRAINT "CourseSubmissionImage_courseSubmissionId_fkey" FOREIGN KEY ("courseSubmissionId") REFERENCES "CourseSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
