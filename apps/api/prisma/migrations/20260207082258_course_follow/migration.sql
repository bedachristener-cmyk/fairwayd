-- CreateTable
CREATE TABLE "CourseFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseFollow_courseId_idx" ON "CourseFollow"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseFollow_userId_courseId_key" ON "CourseFollow"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "CourseFollow" ADD CONSTRAINT "CourseFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFollow" ADD CONSTRAINT "CourseFollow_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
