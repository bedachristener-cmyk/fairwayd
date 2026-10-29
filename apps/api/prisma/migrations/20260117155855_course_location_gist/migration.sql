-- Ensure PostGIS extension exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location column if it does not exist
ALTER TABLE public."Course"
ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- GiST index for fast geo queries
CREATE INDEX IF NOT EXISTS "Course_location_gist_idx"
ON public."Course"
USING GIST ("location");
