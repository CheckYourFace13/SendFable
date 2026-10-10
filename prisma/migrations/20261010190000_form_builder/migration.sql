ALTER TABLE "SignupForm" ADD COLUMN "smsConsentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SignupForm" ADD COLUMN "buttonLabel" TEXT NOT NULL DEFAULT 'Subscribe';
ALTER TABLE "SignupForm" ADD COLUMN "successMessage" TEXT NOT NULL DEFAULT 'Thanks for joining. You''ll hear from us soon.';
ALTER TABLE "SignupForm" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'inherit';
ALTER TABLE "SignupForm" ADD COLUMN "emailDisclosureVersion" TEXT NOT NULL DEFAULT 'email-consent-2026-10-10';
ALTER TABLE "SignupForm" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "EmailConsentEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "formId" TEXT,
    "email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "disclosureVersion" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailConsentEvent_workspaceId_email_createdAt_idx" ON "EmailConsentEvent"("workspaceId", "email", "createdAt");
CREATE INDEX "EmailConsentEvent_contactId_idx" ON "EmailConsentEvent"("contactId");

ALTER TABLE "EmailConsentEvent" ADD CONSTRAINT "EmailConsentEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailConsentEvent" ADD CONSTRAINT "EmailConsentEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
