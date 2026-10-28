ALTER TABLE "User" ADD COLUMN "emailTripNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailFollowNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Notification" ADD COLUMN "actorUserId" TEXT,
ADD COLUMN "emailPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "emailNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "emailSentAt" TIMESTAMP(3);
CREATE INDEX "Notification_emailPending_emailNextAttemptAt_idx" ON "Notification"("emailPending", "emailNextAttemptAt");
