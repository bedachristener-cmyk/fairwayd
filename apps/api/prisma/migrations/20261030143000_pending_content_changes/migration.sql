CREATE TABLE "PendingChange" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "action" TEXT NOT NULL CHECK ("action" IN ('AVATAR','PROFILE','POST_EDIT','COMMENT_CREATE','COMMENT_EDIT','TRIP_COVER','TIP_CREATE','COURSE_CREATE')),
 "targetId" TEXT NOT NULL, "payload" JSONB NOT NULL, "snapshot" JSONB NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','APPROVED','REJECTED')),
 "dedupKey" TEXT, "reviewCaseIds" TEXT[] NOT NULL, "categories" TEXT[] NOT NULL,
 "reviewerId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PendingChange_dedupKey_key" ON "PendingChange"("dedupKey");
CREATE INDEX "PendingChange_state_createdAt_idx" ON "PendingChange"("state", "createdAt");
CREATE INDEX "PendingChange_expiresAt_idx" ON "PendingChange"("expiresAt");
CREATE TABLE "PendingChangeImage" (
 "id" TEXT PRIMARY KEY, "pendingChangeId" TEXT NOT NULL REFERENCES "PendingChange"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "position" INTEGER NOT NULL CHECK ("position" BETWEEN 0 AND 4), "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('image/jpeg','image/png','image/webp')), "originalName" TEXT NOT NULL, "fieldName" TEXT NOT NULL, "bytes" BYTEA NOT NULL CHECK (octet_length("bytes") BETWEEN 1 AND 5242880)
);
CREATE UNIQUE INDEX "PendingChangeImage_pendingChangeId_position_key" ON "PendingChangeImage"("pendingChangeId", "position");
