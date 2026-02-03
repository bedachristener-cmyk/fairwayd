-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT,
ALTER COLUMN "handle" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;
