-- Auditable Scribe campaign image selection (nullable = no clearly relevant image).
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN IF NOT EXISTS "imageSourceType" TEXT;
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN IF NOT EXISTS "imageSourcePageUrl" TEXT;
