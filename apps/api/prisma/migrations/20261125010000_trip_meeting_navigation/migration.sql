-- Optional scheduling and navigation fields. Existing item values remain unchanged.
ALTER TABLE "TripItem" ADD COLUMN "meetingTime" TEXT;
ALTER TABLE "TripItem" ADD COLUMN "navigationAddress" TEXT;
