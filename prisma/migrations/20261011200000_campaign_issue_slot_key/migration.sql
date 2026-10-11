-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "issueSlotKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_workspaceId_issueSlotKey_key" ON "Campaign"("workspaceId", "issueSlotKey");
