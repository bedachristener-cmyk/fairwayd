-- Add trip-level base currency with a default for existing and future trips.
ALTER TABLE "Trip" ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'CHF';

-- Store item costs in original currency and preserve the historical conversion.
ALTER TABLE "TripItem"
  ADD COLUMN "amount" DOUBLE PRECISION,
  ADD COLUMN "exchangeRate" DOUBLE PRECISION,
  ADD COLUMN "baseAmount" DOUBLE PRECISION;
