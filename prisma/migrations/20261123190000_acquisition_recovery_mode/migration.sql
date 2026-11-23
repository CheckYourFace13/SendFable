-- Automatic safe recovery cadence while a recoverable bounce-rate hard pause is active.
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "recoveryMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AcquisitionPipelineControl" ADD COLUMN IF NOT EXISTS "recoveryEnteredAt" TIMESTAMP(3);
