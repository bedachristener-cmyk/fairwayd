ALTER TABLE "TripItem" ADD COLUMN "paidByMemberId" TEXT;

CREATE INDEX "TripItem_paidByMemberId_idx" ON "TripItem"("paidByMemberId");

ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
