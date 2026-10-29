-- Set TripMember role default after TripRole MEMBER enum value exists
ALTER TABLE "TripMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';