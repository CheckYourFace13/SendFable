-- SF-007/009: first-party analytics events + partner applications
CREATE TABLE IF NOT EXISTS "ProductAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "path" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "sessionId" TEXT,
    "firstTouch" TEXT,
    "lastTouch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductAnalyticsEvent_event_createdAt_idx" ON "ProductAnalyticsEvent"("event", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductAnalyticsEvent_createdAt_idx" ON "ProductAnalyticsEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ProductAnalyticsEvent_utmCampaign_createdAt_idx" ON "ProductAnalyticsEvent"("utmCampaign", "createdAt");

CREATE TABLE IF NOT EXISTS "PartnerApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "website" TEXT,
    "partnerType" TEXT NOT NULL,
    "audienceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerApplication_email_idx" ON "PartnerApplication"("email");
