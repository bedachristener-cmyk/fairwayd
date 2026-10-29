CREATE TYPE "FieldPrivacy" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

ALTER TABLE "User"
ADD COLUMN "bio" TEXT,
ADD COLUMN "handicap" DOUBLE PRECISION,
ADD COLUMN "homeGolfClub" TEXT,
ADD COLUMN "golfSlogan" TEXT,
ADD COLUMN "favoriteGolfDestination" TEXT,
ADD COLUMN "bioPrivacy" "FieldPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "handicapPrivacy" "FieldPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "homeGolfClubPrivacy" "FieldPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "golfSloganPrivacy" "FieldPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "favoriteGolfDestinationPrivacy" "FieldPrivacy" NOT NULL DEFAULT 'PUBLIC';
