-- Opt-in newsletter automation (TheDrinkPlace-scoped via workspace/config flags).
-- Defaults false: other brands keep approval-only Autopilot behavior.

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "autoWelcomeEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MarketingAutopilotConfig" ADD COLUMN IF NOT EXISTS "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketingAutopilotConfig" ADD COLUMN IF NOT EXISTS "lastAutoSentAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AutomationSendLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "contactId" TEXT,
    "draftId" TEXT,
    "campaignId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationSendLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationSendLedger_workspaceId_kind_idempotencyKey_key"
  ON "AutomationSendLedger"("workspaceId", "kind", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "AutomationSendLedger_status_nextAttemptAt_idx"
  ON "AutomationSendLedger"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "AutomationSendLedger_workspaceId_createdAt_idx"
  ON "AutomationSendLedger"("workspaceId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AutomationSendLedger"
    ADD CONSTRAINT "AutomationSendLedger_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
