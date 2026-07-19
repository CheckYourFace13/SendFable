-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sendingHeldAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sendingHoldReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- AlterTable Workspace
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT NOT NULL DEFAULT '#0F172A';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "fontStack" TEXT NOT NULL DEFAULT 'Inter,-apple-system,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "businessDescription" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "onboardingData" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "publicArchiveEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "publicArchiveIndexable" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_referralCode_key" ON "Workspace"("referralCode");

-- AlterTable Template
ALTER TABLE "Template" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "goal" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "suggestedSubjects" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "suggestedPreviewText" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "recommendedCta" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "isPlatform" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "shareSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Template_shareSlug_key" ON "Template"("shareSlug");
CREATE INDEX IF NOT EXISTS "Template_isPlatform_category_idx" ON "Template"("isPlatform", "category");
CREATE INDEX IF NOT EXISTS "Template_goal_idx" ON "Template"("goal");

-- AlterTable Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "simpleMode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "goal" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "testSentAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "publicArchive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "publicIndexable" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_publicSlug_key" ON "Campaign"("publicSlug");

-- CreateTable CreditLedgerEntry
CREATE TABLE IF NOT EXISTS "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_userId_createdAt_idx" ON "CreditLedgerEntry"("userId", "createdAt");

-- CreateTable AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateTable LandingPage
CREATE TABLE IF NOT EXISTS "LandingPage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blocksJson" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LandingPage_workspaceId_slug_key" ON "LandingPage"("workspaceId", "slug");

-- CreateTable ReferralAttribution
CREATE TABLE IF NOT EXISTS "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referredEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'clicked',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralAttribution_referredUserId_key" ON "ReferralAttribution"("referredUserId");
CREATE INDEX IF NOT EXISTS "ReferralAttribution_referralCode_idx" ON "ReferralAttribution"("referralCode");

-- FKs
DO $$ BEGIN
  ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
