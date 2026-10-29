-- Nullable so existing users retain the application-level CHF fallback without a mass write.
ALTER TABLE "User" ADD COLUMN "preferredCurrency" TEXT;
