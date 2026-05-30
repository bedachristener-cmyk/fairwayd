CREATE TYPE "TripItemExpenseType" AS ENUM ('PERSONAL', 'SHARED');

ALTER TABLE "TripItem"
  ADD COLUMN "expenseType" "TripItemExpenseType" NOT NULL DEFAULT 'SHARED';
