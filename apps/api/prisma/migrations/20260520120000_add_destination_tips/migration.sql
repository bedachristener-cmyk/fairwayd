CREATE TABLE "DestinationTip" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationTip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DestinationTip_destinationId_idx" ON "DestinationTip"("destinationId");
CREATE INDEX "DestinationTip_destinationId_createdAt_idx" ON "DestinationTip"("destinationId", "createdAt");
CREATE INDEX "DestinationTip_userId_idx" ON "DestinationTip"("userId");
CREATE INDEX "DestinationTip_createdAt_idx" ON "DestinationTip"("createdAt");

ALTER TABLE "DestinationTip" ADD CONSTRAINT "DestinationTip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DestinationTip" ADD CONSTRAINT "DestinationTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
