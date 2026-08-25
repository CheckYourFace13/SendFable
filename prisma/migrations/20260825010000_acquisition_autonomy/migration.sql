-- AlterTable
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN "hardPause" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN "rampStage" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN "stageEnteredAt" TIMESTAMP(3);
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN "lastRampEvalAt" TIMESTAMP(3);
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN "workerFailStreak" INTEGER NOT NULL DEFAULT 0;
