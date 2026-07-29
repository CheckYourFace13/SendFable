-- SF-012: IndexNow audit + nurture send log
CREATE TABLE IF NOT EXISTS "IndexNowSubmission" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "status" INTEGER,
    "batchSize" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndexNowSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IndexNowSubmission_url_createdAt_idx" ON "IndexNowSubmission"("url", "createdAt");
CREATE INDEX IF NOT EXISTS "IndexNowSubmission_createdAt_idx" ON "IndexNowSubmission"("createdAt");

CREATE TABLE IF NOT EXISTS "NurtureSendLog" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepDay" INTEGER NOT NULL,
    "recipientMask" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NurtureSendLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NurtureSendLog_sequenceId_createdAt_idx" ON "NurtureSendLog"("sequenceId", "createdAt");
CREATE INDEX IF NOT EXISTS "NurtureSendLog_createdAt_idx" ON "NurtureSendLog"("createdAt");
