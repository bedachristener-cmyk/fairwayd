-- Add email verification and privacy acceptance fields.
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyVersion" TEXT;

-- Avoid locking out existing OAuth, magic-link, and seeded users.
UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "updatedAt", "createdAt", NOW())
WHERE "email" IS NOT NULL
  AND "emailVerifiedAt" IS NULL;

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailVerificationCode_userId_createdAt_idx"
  ON "EmailVerificationCode"("userId", "createdAt");

CREATE INDEX "EmailVerificationCode_expiresAt_idx"
  ON "EmailVerificationCode"("expiresAt");

ALTER TABLE "EmailVerificationCode"
  ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
