CREATE TABLE "DestinationTipHelpful" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationTipHelpful_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DestinationTipHelpful_tipId_userId_key" ON "DestinationTipHelpful"("tipId", "userId");
CREATE INDEX "DestinationTipHelpful_tipId_idx" ON "DestinationTipHelpful"("tipId");
CREATE INDEX "DestinationTipHelpful_userId_idx" ON "DestinationTipHelpful"("userId");

ALTER TABLE "DestinationTipHelpful" ADD CONSTRAINT "DestinationTipHelpful_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "DestinationTip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DestinationTipHelpful" ADD CONSTRAINT "DestinationTipHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
