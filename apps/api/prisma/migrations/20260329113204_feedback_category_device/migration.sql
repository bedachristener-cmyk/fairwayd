-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "device" TEXT,
ADD COLUMN     "userAgent" TEXT;
