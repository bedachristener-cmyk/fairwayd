CREATE TABLE "ContentModerationCase" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "scope" TEXT NOT NULL, "digest" TEXT NOT NULL,
 "blockedFingerprint" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "categories" TEXT[] NOT NULL,
 "text" TEXT, "bytes" BYTEA, "mimeType" TEXT, "reviewerId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 "decidedAt" TIMESTAMP(3), CONSTRAINT "ContentModerationCase_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ContentModerationCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ContentModerationCase_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','BLOCKED')),
 CONSTRAINT "ContentModerationCase_bytes_limit" CHECK ("bytes" IS NULL OR octet_length("bytes") <= 5242880)
);
CREATE UNIQUE INDEX "ContentModerationCase_userId_scope_digest_key" ON "ContentModerationCase"("userId", "scope", "digest");
CREATE INDEX "ContentModerationCase_expiresAt_idx" ON "ContentModerationCase"("expiresAt");
CREATE INDEX "ContentModerationCase_status_createdAt_idx" ON "ContentModerationCase"("status", "createdAt");
CREATE INDEX "ContentModerationCase_blockedFingerprint_idx" ON "ContentModerationCase"("blockedFingerprint");
