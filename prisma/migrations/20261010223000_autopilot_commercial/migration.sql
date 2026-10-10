-- Autopilot commercial model: trial, credits, promos, creation source, schedule.

ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN "creationSource" TEXT;
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN "brandingRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN "scheduledFor" TIMESTAMP(3);
ALTER TABLE "MarketingAutopilotDraft" ADD COLUMN "scheduleTimezone" TEXT;

CREATE INDEX "MarketingAutopilotDraft_workspaceId_creationSource_createdAt_idx"
  ON "MarketingAutopilotDraft"("workspaceId", "creationSource", "createdAt");

CREATE TABLE "AutopilotCommercial" (
    "workspaceId" TEXT NOT NULL,
    "trialStartedAt" TIMESTAMP(3),
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "promo" TEXT NOT NULL DEFAULT 'NONE',
    "promoRedeemedAt" TIMESTAMP(3),
    "brandConfirmedAt" TIMESTAMP(3),
    "brandSuggestedAt" TIMESTAMP(3),
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "backgroundColor" TEXT,
    "textColor" TEXT,
    CONSTRAINT "AutopilotCommercial_pkey" PRIMARY KEY ("workspaceId")
);

ALTER TABLE "AutopilotCommercial"
  ADD CONSTRAINT "AutopilotCommercial_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutopilotCreditGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutopilotCreditGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutopilotCreditGrant_paymentId_key" ON "AutopilotCreditGrant"("paymentId");
CREATE INDEX "AutopilotCreditGrant_workspaceId_idx" ON "AutopilotCreditGrant"("workspaceId");

ALTER TABLE "AutopilotCreditGrant"
  ADD CONSTRAINT "AutopilotCreditGrant_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
