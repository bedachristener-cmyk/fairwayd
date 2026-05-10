-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TripRole" ADD VALUE 'ADMIN';
ALTER TYPE "TripRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bookingRef" TEXT,
ADD COLUMN     "caddyFee" DOUBLE PRECISION,
ADD COLUMN     "cartFee" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "directPrice" DOUBLE PRECISION,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerPrice" DOUBLE PRECISION,
ADD COLUMN     "startTime" TEXT;


