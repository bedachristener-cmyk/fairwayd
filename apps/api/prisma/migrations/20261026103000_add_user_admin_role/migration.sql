-- Nullable role: existing Railway allowlist applies only until an explicit role is saved.
CREATE TYPE "AdminRole" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "User" ADD COLUMN "adminRole" "AdminRole";
