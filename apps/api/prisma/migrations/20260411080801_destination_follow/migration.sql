-- CreateTable
CREATE TABLE "DestinationFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestinationFollow_destinationId_idx" ON "DestinationFollow"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationFollow_userId_destinationId_key" ON "DestinationFollow"("userId", "destinationId");

-- AddForeignKey
ALTER TABLE "DestinationFollow" ADD CONSTRAINT "DestinationFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationFollow" ADD CONSTRAINT "DestinationFollow_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
