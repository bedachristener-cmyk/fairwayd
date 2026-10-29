ALTER TABLE "User" ADD COLUMN "emailModerationNotifications" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PendingPost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "visibility" "Visibility" NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "dedupKey" TEXT,
  "reviewCaseIds" TEXT[] NOT NULL,
  "categories" TEXT[] NOT NULL,
  "postId" TEXT,
  "reviewerId" TEXT,
  "publishToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PendingPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendingPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PendingPost_dedupKey_key" ON "PendingPost"("dedupKey");
CREATE INDEX "PendingPost_state_createdAt_idx" ON "PendingPost"("state", "createdAt");
CREATE INDEX "PendingPost_expiresAt_idx" ON "PendingPost"("expiresAt");

CREATE TABLE "PendingPostImage" (
  "id" TEXT NOT NULL,
  "pendingPostId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  CONSTRAINT "PendingPostImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendingPostImage_pendingPostId_fkey" FOREIGN KEY ("pendingPostId") REFERENCES "PendingPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PendingPostImage_pendingPostId_position_key" ON "PendingPostImage"("pendingPostId", "position");
