CREATE TYPE "TripItemPaymentMode" AS ENUM ('PAID_BY_ONE', 'EACH_PAYS_OWN');

CREATE TABLE "TripItemCost" (
    "id" TEXT NOT NULL,
    "tripItemId" TEXT NOT NULL,
    "label" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "exchangeRate" DOUBLE PRECISION,
    "baseAmount" DOUBLE PRECISION,
    "costMode" "TripItemCostMode" NOT NULL DEFAULT 'TOTAL',
    "paymentMode" "TripItemPaymentMode" NOT NULL DEFAULT 'PAID_BY_ONE',
    "paidByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItemCost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripItemCostParticipant" (
    "id" TEXT NOT NULL,
    "costId" TEXT NOT NULL,
    "tripMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItemCostParticipant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripItemCost_tripItemId_idx" ON "TripItemCost"("tripItemId");

CREATE INDEX "TripItemCost_paidByMemberId_idx" ON "TripItemCost"("paidByMemberId");

CREATE UNIQUE INDEX "TripItemCostParticipant_costId_tripMemberId_key" ON "TripItemCostParticipant"("costId", "tripMemberId");

CREATE INDEX "TripItemCostParticipant_tripMemberId_idx" ON "TripItemCostParticipant"("tripMemberId");

ALTER TABLE "TripItemCost" ADD CONSTRAINT "TripItemCost_tripItemId_fkey" FOREIGN KEY ("tripItemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripItemCost" ADD CONSTRAINT "TripItemCost_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TripItemCostParticipant" ADD CONSTRAINT "TripItemCostParticipant_costId_fkey" FOREIGN KEY ("costId") REFERENCES "TripItemCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripItemCostParticipant" ADD CONSTRAINT "TripItemCostParticipant_tripMemberId_fkey" FOREIGN KEY ("tripMemberId") REFERENCES "TripMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TripItemCost" (
    "id",
    "tripItemId",
    "label",
    "amount",
    "currency",
    "exchangeRate",
    "baseAmount",
    "costMode",
    "paymentMode",
    "paidByMemberId",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || "TripItem"."id",
    "TripItem"."id",
    COALESCE(NULLIF("TripItem"."title", ''), 'Trip item'),
    "TripItem"."amount",
    "TripItem"."currency",
    "TripItem"."exchangeRate",
    "TripItem"."baseAmount",
    "TripItem"."costMode",
    CASE
      WHEN "TripItem"."paidByMemberId" IS NULL THEN 'EACH_PAYS_OWN'::"TripItemPaymentMode"
      ELSE 'PAID_BY_ONE'::"TripItemPaymentMode"
    END,
    "TripItem"."paidByMemberId",
    "TripItem"."createdAt",
    CURRENT_TIMESTAMP
FROM "TripItem"
WHERE
    "TripItem"."amount" IS NOT NULL
    OR "TripItem"."baseAmount" IS NOT NULL;

INSERT INTO "TripItemCostParticipant" (
    "id",
    "costId",
    "tripMemberId",
    "createdAt"
)
SELECT
    'legacy_' || "TripItemParticipant"."id",
    'legacy_' || "TripItemParticipant"."tripItemId",
    "TripItemParticipant"."tripMemberId",
    "TripItemParticipant"."createdAt"
FROM "TripItemParticipant"
INNER JOIN "TripItemCost"
  ON "TripItemCost"."id" = 'legacy_' || "TripItemParticipant"."tripItemId";
