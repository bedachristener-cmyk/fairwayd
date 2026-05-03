CREATE TABLE "EmailLoginToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLoginToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailLoginToken_tokenHash_key" ON "EmailLoginToken"("tokenHash");
CREATE INDEX "EmailLoginToken_email_idx" ON "EmailLoginToken"("email");
CREATE INDEX "EmailLoginToken_expiresAt_idx" ON "EmailLoginToken"("expiresAt");
