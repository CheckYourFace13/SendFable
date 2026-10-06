-- Marketing Autopilot: watch a public marketing page → draft → owner approval → send

CREATE TYPE "AutopilotCheckFrequency" AS ENUM ('DAILY', 'TWICE_DAILY', 'WEEKLY');

CREATE TYPE "AutopilotDraftStatus" AS ENUM (
  'DETECTED',
  'DRAFTED',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EDITING',
  'SENT',
  'EXPIRED'
);

CREATE TABLE "MarketingAutopilotConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pageUrl" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL DEFAULT 'all',
    "audienceTagIds" JSONB NOT NULL DEFAULT '[]',
    "audienceSegmentId" TEXT,
    "checkFrequency" "AutopilotCheckFrequency" NOT NULL DEFAULT 'DAILY',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "lastFetchedAt" TIMESTAMP(3),
    "lastContentHash" TEXT,
    "lastContentText" TEXT,
    "lastMeaningfulHash" TEXT,
    "fetchCount" INTEGER NOT NULL DEFAULT 0,
    "meaningfulChangeCount" INTEGER NOT NULL DEFAULT 0,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" BIGINT NOT NULL DEFAULT 0,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAutopilotConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingAutopilotConfig_workspaceId_key" ON "MarketingAutopilotConfig"("workspaceId");
CREATE INDEX "MarketingAutopilotConfig_enabled_pausedAt_lastFetchedAt_idx" ON "MarketingAutopilotConfig"("enabled", "pausedAt", "lastFetchedAt");

ALTER TABLE "MarketingAutopilotConfig" ADD CONSTRAINT "MarketingAutopilotConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MarketingAutopilotDraft" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "campaignId" TEXT,
    "status" "AutopilotDraftStatus" NOT NULL DEFAULT 'DETECTED',
    "sourceUrl" TEXT NOT NULL,
    "changeFingerprint" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "changedContent" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT,
    "preheader" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "goal" TEXT,
    "templateSlug" TEXT,
    "explanation" TEXT,
    "approvalTokenVersion" INTEGER NOT NULL DEFAULT 1,
    "approvalEmailSentAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedAction" TEXT,
    "generationCostMicros" BIGINT NOT NULL DEFAULT 0,
    "generationModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAutopilotDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingAutopilotDraft_campaignId_key" ON "MarketingAutopilotDraft"("campaignId");
CREATE UNIQUE INDEX "MarketingAutopilotDraft_workspaceId_changeFingerprint_key" ON "MarketingAutopilotDraft"("workspaceId", "changeFingerprint");
CREATE INDEX "MarketingAutopilotDraft_workspaceId_status_idx" ON "MarketingAutopilotDraft"("workspaceId", "status");
CREATE INDEX "MarketingAutopilotDraft_status_expiresAt_idx" ON "MarketingAutopilotDraft"("status", "expiresAt");
CREATE INDEX "MarketingAutopilotDraft_configId_status_idx" ON "MarketingAutopilotDraft"("configId", "status");

ALTER TABLE "MarketingAutopilotDraft" ADD CONSTRAINT "MarketingAutopilotDraft_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAutopilotDraft" ADD CONSTRAINT "MarketingAutopilotDraft_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MarketingAutopilotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAutopilotDraft" ADD CONSTRAINT "MarketingAutopilotDraft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
