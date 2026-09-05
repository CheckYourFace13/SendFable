-- AlterTable
ALTER TABLE "AcquisitionProspect" ADD COLUMN IF NOT EXISTS "firstCampaignAt" TIMESTAMP(3);
ALTER TABLE "AcquisitionProspect" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AcquisitionMessage" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3);
ALTER TABLE "AcquisitionMessage" ADD COLUMN IF NOT EXISTS "copyVersion" TEXT;
ALTER TABLE "AcquisitionMessage" ADD COLUMN IF NOT EXISTS "openerType" TEXT;
ALTER TABLE "AcquisitionMessage" ADD COLUMN IF NOT EXISTS "ctaPath" TEXT;

-- AlterTable
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "activeCopyVersion" TEXT NOT NULL DEFAULT 'v1a';
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "lastCohortEvalAt" TIMESTAMP(3);
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "lastCohortEvalDelivered" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "optimizationState" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "AcquisitionMessage_deliveredAt_idx" ON "AcquisitionMessage"("deliveredAt");
CREATE INDEX IF NOT EXISTS "AcquisitionMessage_copyVersion_idx" ON "AcquisitionMessage"("copyVersion");
