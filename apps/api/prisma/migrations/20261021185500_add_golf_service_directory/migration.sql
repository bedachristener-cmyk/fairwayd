-- Golf Near Me: entirely separate from the existing Course table.
-- No data import or Google Places response snapshots.
-- This migration is committed to the feature branch only, not applied to any DB.

-- CreateEnum
CREATE TYPE "GolfServiceStatus" AS ENUM ('DRAFT', 'VERIFIED', 'HIDDEN');
CREATE TYPE "GolfServiceCategory" AS ENUM ('SIMULATOR', 'SHOP', 'RANGE', 'ACADEMY', 'FITTING');
CREATE TYPE "GolfServiceSourceKind" AS ENUM ('OFFICIAL_WEBSITE', 'USER_REPORT', 'OPENSTREETMAP', 'INDEPENDENT_RESEARCH');
CREATE TYPE "GolfServiceProviderKind" AS ENUM ('UNKNOWN', 'PERSON', 'ORGANIZATION');
CREATE TYPE "GolfServiceProviderRole" AS ENUM ('GOLF_PRO', 'FITTER', 'OPERATOR');

-- CreateTable
CREATE TABLE "GolfServiceVenue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "addressLine" TEXT,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "website" TEXT,
    "phone" TEXT,
    "googlePlaceId" TEXT,
    "osmRef" TEXT,
    "status" "GolfServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceKind" "GolfServiceSourceKind",
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfServiceVenue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GolfServiceVenue_coordinate_pair_check" CHECK (
      ("lat" IS NULL AND "lon" IS NULL)
      OR ("lat" IS NOT NULL AND "lon" IS NOT NULL)
    ),
    CONSTRAINT "GolfServiceVenue_coordinate_range_check" CHECK (
      "lat" IS NULL OR ("lat" BETWEEN -90 AND 90 AND "lon" BETWEEN -180 AND 180)
    ),
    CONSTRAINT "GolfServiceVenue_verified_source_check" CHECK (
      "status" <> 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "sourceKind" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "GolfServiceOffering" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "category" "GolfServiceCategory" NOT NULL,
    "status" "GolfServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "label" TEXT,
    "description" TEXT,
    "unitCount" INTEGER,
    "availableToPublic" BOOLEAN,
    "bookingUrl" TEXT,
    "sourceKind" "GolfServiceSourceKind",
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfServiceOffering_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GolfServiceOffering_unit_count_check" CHECK (
      "unitCount" IS NULL OR "unitCount" > 0
    ),
    CONSTRAINT "GolfServiceOffering_verified_source_check" CHECK (
      "status" <> 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "sourceKind" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "GolfServiceProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "GolfServiceProviderKind" NOT NULL DEFAULT 'UNKNOWN',
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfServiceVenueProvider" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "role" "GolfServiceProviderRole" NOT NULL,
    "status" "GolfServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceKind" "GolfServiceSourceKind",
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolfServiceVenueProvider_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GolfServiceVenueProvider_verified_source_check" CHECK (
      "status" <> 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "sourceKind" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "GolfServiceVenue_googlePlaceId_key" ON "GolfServiceVenue"("googlePlaceId");
CREATE UNIQUE INDEX "GolfServiceVenue_osmRef_key" ON "GolfServiceVenue"("osmRef");
CREATE INDEX "GolfServiceVenue_country_status_idx" ON "GolfServiceVenue"("country", "status");
CREATE INDEX "GolfServiceVenue_country_region_idx" ON "GolfServiceVenue"("country", "region");
CREATE INDEX "GolfServiceVenue_city_idx" ON "GolfServiceVenue"("city");
CREATE INDEX "GolfServiceVenue_lat_lon_idx" ON "GolfServiceVenue"("lat", "lon");

CREATE UNIQUE INDEX "GolfServiceOffering_venueId_category_key" ON "GolfServiceOffering"("venueId", "category");
CREATE INDEX "GolfServiceOffering_category_status_idx" ON "GolfServiceOffering"("category", "status");

CREATE UNIQUE INDEX "GolfServiceVenueProvider_venueId_providerId_role_key"
  ON "GolfServiceVenueProvider"("venueId", "providerId", "role");
CREATE INDEX "GolfServiceVenueProvider_providerId_idx" ON "GolfServiceVenueProvider"("providerId");

-- AddForeignKey
ALTER TABLE "GolfServiceOffering"
  ADD CONSTRAINT "GolfServiceOffering_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "GolfServiceVenue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GolfServiceVenueProvider"
  ADD CONSTRAINT "GolfServiceVenueProvider_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "GolfServiceVenue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GolfServiceVenueProvider"
  ADD CONSTRAINT "GolfServiceVenueProvider_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "GolfServiceProvider"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
