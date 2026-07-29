-- SMS (Text Messaging product) — flag-gated, non-destructive.
-- * No rows are deleted or rewritten.
-- * Contact.email becomes nullable; a CHECK constraint guarantees every
--   contact keeps at least one reachable identifier (email OR phoneE164).
-- * All other changes are additive (new enums, columns, tables).

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'SMS', 'BOTH');

CREATE TYPE "SmsConsentStatus" AS ENUM ('NOT_PROVIDED', 'PENDING_CONSENT', 'SUBSCRIBED', 'OPTED_OUT', 'INVALID', 'BLOCKED');

CREATE TYPE "SmsPlan" AS ENUM ('TEXT_ENTRY', 'TEXT_ESSENTIALS', 'TEXT_ADVANTAGE');

CREATE TYPE "SmsSubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED');

CREATE TYPE "SmsActivationStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'REGISTRATION_SUBMITTED', 'COMPLETED', 'CANCELLED');

CREATE TYPE "SmsDirection" AS ENUM ('OUTBOUND', 'INBOUND');

CREATE TYPE "SmsUsageType" AS ENUM ('OUTBOUND_SEGMENT', 'INBOUND_INCLUDED', 'INBOUND_OVERAGE');

CREATE TYPE "SmsUsageStatus" AS ENUM ('PENDING', 'BILLABLE', 'BILLED', 'VOID');

CREATE TYPE "SmsMessageStatus" AS ENUM ('QUEUED', 'ACCEPTED', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

CREATE TYPE "SmsExceptionalChargeStatus" AS ENUM ('DRAFT', 'PENDING_CUSTOMER_APPROVAL', 'APPROVED', 'REJECTED', 'INVOICED', 'CANCELLED');

CREATE TYPE "SmsNumberStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'RELEASED');

CREATE TYPE "SmsRegistrationStatus" AS ENUM ('NOT_STARTED', 'PREPARING', 'SUBMITTED', 'PENDING_CARRIER', 'APPROVED', 'REJECTED');

CREATE TYPE "SmsConsentAction" AS ENUM ('OPT_IN', 'RE_OPT_IN', 'OPT_OUT', 'MARKED_INVALID', 'MARKED_BLOCKED', 'IMPORT_RECORDED');

-- ─── Contact: unified email/phone model ──────────────────────────────────────

ALTER TABLE "Contact" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "Contact" ADD COLUMN "company" TEXT;
ALTER TABLE "Contact" ADD COLUMN "birthday" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN "address" TEXT;
ALTER TABLE "Contact" ADD COLUMN "phoneE164" TEXT;
ALTER TABLE "Contact" ADD COLUMN "smsStatus" "SmsConsentStatus" NOT NULL DEFAULT 'NOT_PROVIDED';
ALTER TABLE "Contact" ADD COLUMN "smsConsentSource" TEXT;
ALTER TABLE "Contact" ADD COLUMN "smsConsentAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN "smsConsentDisclosureVersion" TEXT;
ALTER TABLE "Contact" ADD COLUMN "smsOptedOutAt" TIMESTAMP(3);

-- Every existing row has email NOT NULL, so this validates instantly and no
-- existing contact can be orphaned.
ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_email_or_phone_check"
  CHECK ("email" IS NOT NULL OR "phoneE164" IS NOT NULL);

CREATE UNIQUE INDEX "Contact_workspaceId_phoneE164_key" ON "Contact"("workspaceId", "phoneE164");
CREATE INDEX "Contact_workspaceId_smsStatus_idx" ON "Contact"("workspaceId", "smsStatus");

-- ─── SignupForm: phone collection + requirement modes ────────────────────────

ALTER TABLE "SignupForm" ADD COLUMN "requirementMode" TEXT NOT NULL DEFAULT 'email-required';
ALTER TABLE "SignupForm" ADD COLUMN "collectPhone" BOOLEAN NOT NULL DEFAULT false;

-- ─── Campaign: channel + SMS content (email pipeline untouched) ──────────────

ALTER TABLE "Campaign" ADD COLUMN "channel" "CampaignChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "Campaign" ADD COLUMN "smsBody" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "smsEncoding" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "smsSegmentsPerMessage" INTEGER;
ALTER TABLE "Campaign" ADD COLUMN "smsEstimatedSegments" INTEGER;
ALTER TABLE "Campaign" ADD COLUMN "smsEstimatedChargeMicros" BIGINT;
ALTER TABLE "Campaign" ADD COLUMN "smsEstimatedCostMicros" BIGINT;
ALTER TABLE "Campaign" ADD COLUMN "smsSentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "smsDeliveredCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "smsFailedCount" INTEGER NOT NULL DEFAULT 0;

-- ─── SmsSubscription ─────────────────────────────────────────────────────────

CREATE TABLE "SmsSubscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "plan" "SmsPlan" NOT NULL,
    "status" "SmsSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "baseMonthlyPriceCents" INTEGER NOT NULL,
    "appliedMonthlyPriceCents" INTEGER NOT NULL,
    "bundleDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "bundleEligibilitySource" TEXT,
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionItemId" TEXT,
    "stripeOutboundItemId" TEXT,
    "stripeInboundOverageItemId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsSubscription_workspaceId_key" ON "SmsSubscription"("workspaceId");
CREATE UNIQUE INDEX "SmsSubscription_stripeSubscriptionId_key" ON "SmsSubscription"("stripeSubscriptionId");
CREATE INDEX "SmsSubscription_status_idx" ON "SmsSubscription"("status");

ALTER TABLE "SmsSubscription" ADD CONSTRAINT "SmsSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsActivation ───────────────────────────────────────────────────────────

CREATE TABLE "SmsActivation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "SmsActivationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "standardFeeCents" INTEGER NOT NULL DEFAULT 9900,
    "stripePaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "registrationSubmittedAt" TIMESTAMP(3),
    "nonrefundableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsActivation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsActivation_workspaceId_key" ON "SmsActivation"("workspaceId");

ALTER TABLE "SmsActivation" ADD CONSTRAINT "SmsActivation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsNumber ───────────────────────────────────────────────────────────────

CREATE TABLE "SmsNumber" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "providerNumberId" TEXT,
    "status" "SmsNumberStatus" NOT NULL DEFAULT 'REQUESTED',
    "monthlyCostMicros" BIGINT NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsNumber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsNumber_phoneE164_key" ON "SmsNumber"("phoneE164");
CREATE INDEX "SmsNumber_workspaceId_status_idx" ON "SmsNumber"("workspaceId", "status");

ALTER TABLE "SmsNumber" ADD CONSTRAINT "SmsNumber_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsRegistration ─────────────────────────────────────────────────────────

CREATE TABLE "SmsRegistration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "kind" TEXT NOT NULL,
    "providerReference" TEXT,
    "status" "SmsRegistrationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsRegistration_workspaceId_kind_idx" ON "SmsRegistration"("workspaceId", "kind");

ALTER TABLE "SmsRegistration" ADD CONSTRAINT "SmsRegistration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsMessage ──────────────────────────────────────────────────────────────

CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "campaignId" TEXT,
    "direction" "SmsDirection" NOT NULL,
    "fromE164" TEXT NOT NULL,
    "toE164" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "encoding" TEXT NOT NULL,
    "segments" INTEGER NOT NULL,
    "status" "SmsMessageStatus" NOT NULL,
    "providerMessageId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "errorCode" TEXT,
    "readAt" TIMESTAMP(3),
    "isOptOutKeyword" BOOLEAN NOT NULL DEFAULT false,
    "isHelpKeyword" BOOLEAN NOT NULL DEFAULT false,
    "customerChargeMicros" BIGINT NOT NULL DEFAULT 0,
    "providerCostMicros" BIGINT NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsMessage_providerMessageId_key" ON "SmsMessage"("providerMessageId");
CREATE INDEX "SmsMessage_workspaceId_direction_createdAt_idx" ON "SmsMessage"("workspaceId", "direction", "createdAt");
CREATE INDEX "SmsMessage_workspaceId_readAt_idx" ON "SmsMessage"("workspaceId", "readAt");
CREATE INDEX "SmsMessage_campaignId_idx" ON "SmsMessage"("campaignId");

ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SmsRecipient ────────────────────────────────────────────────────────────

CREATE TABLE "SmsRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "mergeData" JSONB NOT NULL DEFAULT '{}',
    "renderedBody" TEXT,
    "encoding" TEXT,
    "segments" INTEGER,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "SmsRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsRecipient_providerMessageId_key" ON "SmsRecipient"("providerMessageId");
CREATE UNIQUE INDEX "SmsRecipient_campaignId_contactId_key" ON "SmsRecipient"("campaignId", "contactId");
CREATE INDEX "SmsRecipient_campaignId_status_idx" ON "SmsRecipient"("campaignId", "status");

ALTER TABLE "SmsRecipient" ADD CONSTRAINT "SmsRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmsRecipient" ADD CONSTRAINT "SmsRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsSuppression ──────────────────────────────────────────────────────────

CREATE TABLE "SmsSuppression" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsSuppression_workspaceId_phoneE164_key" ON "SmsSuppression"("workspaceId", "phoneE164");
CREATE INDEX "SmsSuppression_phoneE164_idx" ON "SmsSuppression"("phoneE164");

ALTER TABLE "SmsSuppression" ADD CONSTRAINT "SmsSuppression_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsConsentEvent ─────────────────────────────────────────────────────────

CREATE TABLE "SmsConsentEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "action" "SmsConsentAction" NOT NULL,
    "source" TEXT NOT NULL,
    "disclosureVersion" TEXT,
    "providerEventRef" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsConsentEvent_workspaceId_phoneE164_createdAt_idx" ON "SmsConsentEvent"("workspaceId", "phoneE164", "createdAt");
CREATE INDEX "SmsConsentEvent_contactId_idx" ON "SmsConsentEvent"("contactId");

ALTER TABLE "SmsConsentEvent" ADD CONSTRAINT "SmsConsentEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmsConsentEvent" ADD CONSTRAINT "SmsConsentEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SmsUsageLedger ──────────────────────────────────────────────────────────

CREATE TABLE "SmsUsageLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "direction" "SmsDirection" NOT NULL,
    "campaignId" TEXT,
    "messageId" TEXT,
    "providerMessageId" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "segments" INTEGER NOT NULL,
    "unitPriceMicros" BIGINT NOT NULL,
    "customerChargeMicros" BIGINT NOT NULL,
    "providerCostMicros" BIGINT NOT NULL DEFAULT 0,
    "usageType" "SmsUsageType" NOT NULL,
    "status" "SmsUsageStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsUsageLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsUsageLedger_idempotencyKey_key" ON "SmsUsageLedger"("idempotencyKey");
CREATE INDEX "SmsUsageLedger_workspaceId_billingPeriod_idx" ON "SmsUsageLedger"("workspaceId", "billingPeriod");
CREATE INDEX "SmsUsageLedger_workspaceId_usageType_billingPeriod_idx" ON "SmsUsageLedger"("workspaceId", "usageType", "billingPeriod");

ALTER TABLE "SmsUsageLedger" ADD CONSTRAINT "SmsUsageLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsMonthlyUsage ─────────────────────────────────────────────────────────

CREATE TABLE "SmsMonthlyUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "outboundSegments" INTEGER NOT NULL DEFAULT 0,
    "inboundSegments" INTEGER NOT NULL DEFAULT 0,
    "includedInboundSegments" INTEGER NOT NULL DEFAULT 0,
    "overageInboundSegments" INTEGER NOT NULL DEFAULT 0,
    "customerOutboundChargeMicros" BIGINT NOT NULL DEFAULT 0,
    "customerInboundChargeMicros" BIGINT NOT NULL DEFAULT 0,
    "providerCostMicros" BIGINT NOT NULL DEFAULT 0,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMonthlyUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsMonthlyUsage_workspaceId_month_key" ON "SmsMonthlyUsage"("workspaceId", "month");

ALTER TABLE "SmsMonthlyUsage" ADD CONSTRAINT "SmsMonthlyUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsExceptionalCharge ────────────────────────────────────────────────────

CREATE TABLE "SmsExceptionalCharge" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "providerAmountMicros" BIGINT NOT NULL,
    "customerAmountCents" INTEGER NOT NULL,
    "approvalStatus" "SmsExceptionalChargeStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "stripeInvoiceItemId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsExceptionalCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsExceptionalCharge_workspaceId_approvalStatus_idx" ON "SmsExceptionalCharge"("workspaceId", "approvalStatus");

ALTER TABLE "SmsExceptionalCharge" ADD CONSTRAINT "SmsExceptionalCharge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ContactImportBatch ──────────────────────────────────────────────────────

CREATE TABLE "ContactImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fileName" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "smsConsentMode" TEXT NOT NULL DEFAULT 'none',
    "smsConsentSource" TEXT,
    "smsConsentDate" TIMESTAMP(3),
    "ownerAttestation" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactImportBatch_workspaceId_createdAt_idx" ON "ContactImportBatch"("workspaceId", "createdAt");

ALTER TABLE "ContactImportBatch" ADD CONSTRAINT "ContactImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SmsAdminSetting ─────────────────────────────────────────────────────────

CREATE TABLE "SmsAdminSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "marginWarnPercent" INTEGER NOT NULL DEFAULT 60,
    "assumedOutboundCostMicros" BIGINT NOT NULL DEFAULT 8000,
    "assumedInboundCostMicros" BIGINT NOT NULL DEFAULT 8000,
    "assumedNumberMonthlyCostMicros" BIGINT NOT NULL DEFAULT 1500000,
    "inboundAnomalyThreshold" INTEGER NOT NULL DEFAULT 2000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsAdminSetting_pkey" PRIMARY KEY ("id")
);
