-- CreateTable
CREATE TABLE "SmsComplianceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "legalEntityName" TEXT,
    "dbaBrandName" TEXT,
    "einBrnCiphertext" TEXT,
    "registrationType" TEXT,
    "registrationCountry" TEXT DEFAULT 'US',
    "entityType" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "websiteUrl" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "industryVertical" TEXT,
    "smsUseCase" TEXT,
    "estimatedMonthlyVolume" INTEGER,
    "optInDescription" TEXT,
    "optInFormUrl" TEXT,
    "optInEvidenceUrl" TEXT,
    "privacyPolicyUrl" TEXT,
    "smsTermsUrl" TEXT,
    "sampleMessage1" TEXT,
    "sampleMessage2" TEXT,
    "helpResponse" TEXT,
    "stopResponse" TEXT,
    "brandId" TEXT,
    "campaignId" TEXT,
    "numberId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "providerAccountRelationship" TEXT,
    "status" "SmsRegistrationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "brandFeeMicros" BIGINT NOT NULL DEFAULT 0,
    "vettingFeeMicros" BIGINT NOT NULL DEFAULT 0,
    "campaignFeeMicros" BIGINT NOT NULL DEFAULT 0,
    "numberMonthlyFeeMicros" BIGINT NOT NULL DEFAULT 0,
    "retentionHoldUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsComplianceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsComplianceProfile_workspaceId_key" ON "SmsComplianceProfile"("workspaceId");

-- AddForeignKey
ALTER TABLE "SmsComplianceProfile" ADD CONSTRAINT "SmsComplianceProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
