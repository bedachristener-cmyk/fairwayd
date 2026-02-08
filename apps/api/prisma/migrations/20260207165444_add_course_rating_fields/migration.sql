-- Add course rating fields + holesText
ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "holesText" TEXT,
  ADD COLUMN IF NOT EXISTS "ratingAvg" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER;

CREATE INDEX IF NOT EXISTS "Course_holesText_idx" ON "Course" ("holesText");

-- Enum change: remove MUNICIPAL (best-effort)
-- If the enum already has MUNICIPAL removed, this block is harmless in practice.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'CourseAccess' AND e.enumlabel = 'MUNICIPAL'
  ) THEN
    -- Recreate enum without MUNICIPAL
    ALTER TYPE "CourseAccess" RENAME TO "CourseAccess_old";

    CREATE TYPE "CourseAccess" AS ENUM (
      'PUBLIC',
      'PRIVATE',
      'RESORT',
      'SEMI_PRIVATE'
    );

    ALTER TABLE "Course"
      ALTER COLUMN "access" TYPE "CourseAccess"
      USING "access"::text::"CourseAccess";

    DROP TYPE "CourseAccess_old";
  END IF;
END$$;

-- Added table: course_import (if present in DB, keep it)
CREATE TABLE IF NOT EXISTS "course_import" (
  "id" TEXT PRIMARY KEY,
  "source" TEXT NOT NULL,
  "filename" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
