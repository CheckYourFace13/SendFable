-- CreateEnum
CREATE TYPE "AcquisitionProspectStatus" AS ENUM (
  'DISCOVERED',
  'QUALIFIED',
  'NEEDS_EMAIL',
  'QUEUED',
  'CONTACTED',
  'FOLLOW_UP_1',
  'FOLLOW_UP_2',
  'OUTREACH_COMPLETE',
  'REPLIED',
  'INTERESTED',
  'SIGNED_UP',
  'PAID',
  'NOT_INTERESTED',
  'UNSUBSCRIBED',
  'BOUNCED',
  'COMPLAINT',
  'SUPPRESSED',
  'REJECTED',
  'PAUSED',
  'INCORRECT'
);

-- CreateEnum
CREATE TYPE "AcquisitionMessageStep" AS ENUM ('INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2');

-- CreateEnum
CREATE TYPE "AcquisitionMessageStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'DELIVERED',
  'BOUNCED',
  'COMPLAINED',
  'FAILED',
  'CANCELLED',
  'SKIPPED'
);

-- CreateTable
CREATE TABLE "AcquisitionProspect" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "category" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "sourceUrl" TEXT,
    "sourceKind" TEXT NOT NULL DEFAULT 'seed',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactEmail" TEXT,
    "contactPageUrl" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "newsletterPresent" BOOLEAN NOT NULL DEFAULT false,
    "eventsPromotionsPresent" BOOLEAN NOT NULL DEFAULT false,
    "competitorPlatform" TEXT,
    "activeWebsite" BOOLEAN NOT NULL DEFAULT false,
    "fitSignals" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "personalizationClaim" TEXT,
    "personalizationSourceUrl" TEXT,
    "personalizationEvidence" TEXT,
    "generatedOpener" TEXT,
    "status" "AcquisitionProspectStatus" NOT NULL DEFAULT 'DISCOVERED',
    "suppressionReason" TEXT,
    "ownerApproved" BOOLEAN NOT NULL DEFAULT false,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "replyClass" TEXT,
    "signedUpUserId" TEXT,
    "signupAt" TIMESTAMP(3),
    "firstSendAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "landingPagePath" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionMessage" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "step" "AcquisitionMessageStep" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "AcquisitionMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sesMessageId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "bounceAt" TIMESTAMP(3),
    "complaintAt" TIMESTAMP(3),
    "error" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionEvent" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT,
    "type" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "domain" TEXT,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionPipelineControl" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pauseReason" TEXT,
    "lastDailyReportAt" TIMESTAMP(3),
    "lastTickAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionPipelineControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionProspect_domain_key" ON "AcquisitionProspect"("domain");
CREATE INDEX "AcquisitionProspect_contactEmail_idx" ON "AcquisitionProspect"("contactEmail");
CREATE INDEX "AcquisitionProspect_status_score_idx" ON "AcquisitionProspect"("status", "score");
CREATE INDEX "AcquisitionProspect_nextFollowUpAt_idx" ON "AcquisitionProspect"("nextFollowUpAt");
CREATE INDEX "AcquisitionProspect_discoveredAt_idx" ON "AcquisitionProspect"("discoveredAt");
CREATE INDEX "AcquisitionProspect_category_idx" ON "AcquisitionProspect"("category");

CREATE INDEX "AcquisitionMessage_prospectId_step_idx" ON "AcquisitionMessage"("prospectId", "step");
CREATE INDEX "AcquisitionMessage_sesMessageId_idx" ON "AcquisitionMessage"("sesMessageId");
CREATE INDEX "AcquisitionMessage_status_scheduledAt_idx" ON "AcquisitionMessage"("status", "scheduledAt");
CREATE INDEX "AcquisitionMessage_sentAt_idx" ON "AcquisitionMessage"("sentAt");

CREATE INDEX "AcquisitionEvent_type_createdAt_idx" ON "AcquisitionEvent"("type", "createdAt");
CREATE INDEX "AcquisitionEvent_prospectId_createdAt_idx" ON "AcquisitionEvent"("prospectId", "createdAt");
CREATE INDEX "AcquisitionEvent_createdAt_idx" ON "AcquisitionEvent"("createdAt");

CREATE UNIQUE INDEX "AcquisitionSuppression_email_key" ON "AcquisitionSuppression"("email");
CREATE INDEX "AcquisitionSuppression_domain_idx" ON "AcquisitionSuppression"("domain");
CREATE INDEX "AcquisitionSuppression_reason_createdAt_idx" ON "AcquisitionSuppression"("reason", "createdAt");

-- AddForeignKey
ALTER TABLE "AcquisitionMessage" ADD CONSTRAINT "AcquisitionMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "AcquisitionProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcquisitionEvent" ADD CONSTRAINT "AcquisitionEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "AcquisitionProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
