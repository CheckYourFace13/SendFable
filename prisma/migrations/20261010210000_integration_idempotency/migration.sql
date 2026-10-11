-- CreateTable
CREATE TABLE "IntegrationIdempotency" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "campaignId" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationIdempotency_workspaceId_createdAt_idx" ON "IntegrationIdempotency"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationIdempotency_workspaceId_key_key" ON "IntegrationIdempotency"("workspaceId", "key");

-- AddForeignKey
ALTER TABLE "IntegrationIdempotency" ADD CONSTRAINT "IntegrationIdempotency_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
