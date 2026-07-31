-- SF-019: compliance review queue + expanded registration profile fields.
-- Renames SmsComplianceProfile.status -> providerStatus; adds reviewStatus
-- and audit trail. Safe while all customer SMS flags remain false.

-- CreateEnum
CREATE TYPE "SmsComplianceReviewStatus" AS ENUM (
  'DRAFT',
  'CUSTOMER_SUBMITTED',
  'INTERNAL_REVIEW',
  'NEEDS_CUSTOMER_CHANGES',
  'READY_FOR_PROVIDER',
  'PROVIDER_SUBMITTED',
  'PROVIDER_PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'CANCELLED'
);

-- AlterTable: expand profile + rename provider-facing status
ALTER TABLE "SmsComplianceProfile" RENAME COLUMN "status" TO "providerStatus";

ALTER TABLE "SmsComplianceProfile"
  ADD COLUMN "selectedPlan" TEXT,
  ADD COLUMN "disclosureAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "disclosureVersion" TEXT,
  ADD COLUMN "reviewStatus" "SmsComplianceReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "feeEstimateCents" INTEGER,
  ADD COLUMN "marginEstimateBp" INTEGER,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT;

-- CreateTable
CREATE TABLE "SmsComplianceReviewEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromStatus" "SmsComplianceReviewStatus",
    "toStatus" "SmsComplianceReviewStatus" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsComplianceReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsComplianceReviewEvent_workspaceId_createdAt_idx"
  ON "SmsComplianceReviewEvent"("workspaceId", "createdAt");

CREATE INDEX "SmsComplianceReviewEvent_profileId_createdAt_idx"
  ON "SmsComplianceReviewEvent"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsComplianceReviewEvent"
  ADD CONSTRAINT "SmsComplianceReviewEvent_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "SmsComplianceProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
