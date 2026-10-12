ALTER TABLE "SignupForm" ADD COLUMN IF NOT EXISTS "presentation" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "SignupFormEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "display" TEXT NOT NULL DEFAULT 'inline',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignupFormEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SignupFormEvent_formId_type_createdAt_idx" ON "SignupFormEvent"("formId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "SignupFormEvent_workspaceId_createdAt_idx" ON "SignupFormEvent"("workspaceId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "SignupFormEvent" ADD CONSTRAINT "SignupFormEvent_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "SignupForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
