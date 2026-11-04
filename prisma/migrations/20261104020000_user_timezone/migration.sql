-- Account-level timezone fallback when workspace home timezone is unset.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
