-- AlterTable
ALTER TABLE "TripMember" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;
