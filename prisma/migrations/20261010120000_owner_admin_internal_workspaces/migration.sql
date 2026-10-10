-- Owner Admin (platformRole) + internal/dogfood workspaces

CREATE TYPE "PlatformRole" AS ENUM ('NONE', 'OWNER_ADMIN');

ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'NONE';

ALTER TABLE "Workspace" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "internalPlanOverride" "Plan";
ALTER TABLE "Workspace" ADD COLUMN "internalLabel" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "disabledAt" TIMESTAMP(3);

CREATE TABLE "ProductIssue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "page" TEXT,
    "feature" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductIssue_workspaceId_createdAt_idx" ON "ProductIssue"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "ProductIssue" ADD CONSTRAINT "ProductIssue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductIssue" ADD CONSTRAINT "ProductIssue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
