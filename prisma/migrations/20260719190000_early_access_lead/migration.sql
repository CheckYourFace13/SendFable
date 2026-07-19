-- CreateTable
CREATE TABLE "EarlyAccessLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "businessName" TEXT,
    "website" TEXT,
    "contactCountApprox" TEXT,
    "currentPlatform" TEXT,
    "mainGoal" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'early-access',
    "notes" TEXT,
    "inviteStatus" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyAccessLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessLead_email_key" ON "EarlyAccessLead"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessLead_createdAt_idx" ON "EarlyAccessLead"("createdAt");

-- CreateIndex
CREATE INDEX "EarlyAccessLead_inviteStatus_idx" ON "EarlyAccessLead"("inviteStatus");
