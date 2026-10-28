-- CreateTable
CREATE TABLE "TrySignupDraft" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "prospectId" TEXT,
    "events" JSONB NOT NULL DEFAULT '{}',
    "followUpAt" TIMESTAMP(3),
    "followUpSentAt" TIMESTAMP(3),
    "followUpCancelledAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrySignupDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrySignupDraft_token_key" ON "TrySignupDraft"("token");

-- CreateIndex
CREATE INDEX "TrySignupDraft_prospectId_idx" ON "TrySignupDraft"("prospectId");

-- CreateIndex
CREATE INDEX "TrySignupDraft_followUpAt_idx" ON "TrySignupDraft"("followUpAt");

-- CreateIndex
CREATE INDEX "TrySignupDraft_workspaceId_idx" ON "TrySignupDraft"("workspaceId");
