#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable
git fetch origin
git checkout main
git pull --ff-only origin main
echo "COMMIT=$(git rev-parse --short HEAD)"
docker compose -p sendfable -f docker-compose.prod.yml exec -T postgres \
  psql -U sendfable -d sendfable -v ON_ERROR_STOP=0 -c "
ALTER TABLE \"AcquisitionProspect\" ADD COLUMN IF NOT EXISTS \"firstCampaignAt\" TIMESTAMP(3);
ALTER TABLE \"AcquisitionProspect\" ADD COLUMN IF NOT EXISTS \"emailVerifiedAt\" TIMESTAMP(3);
ALTER TABLE \"AcquisitionMessage\" ADD COLUMN IF NOT EXISTS \"clickedAt\" TIMESTAMP(3);
ALTER TABLE \"AcquisitionMessage\" ADD COLUMN IF NOT EXISTS \"copyVersion\" TEXT;
ALTER TABLE \"AcquisitionMessage\" ADD COLUMN IF NOT EXISTS \"openerType\" TEXT;
ALTER TABLE \"AcquisitionMessage\" ADD COLUMN IF NOT EXISTS \"ctaPath\" TEXT;
ALTER TABLE \"AcquisitionPipelineControl\" ADD COLUMN IF NOT EXISTS \"activeCopyVersion\" TEXT NOT NULL DEFAULT 'v1a';
ALTER TABLE \"AcquisitionPipelineControl\" ADD COLUMN IF NOT EXISTS \"lastCohortEvalAt\" TIMESTAMP(3);
ALTER TABLE \"AcquisitionPipelineControl\" ADD COLUMN IF NOT EXISTS \"lastCohortEvalDelivered\" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE \"AcquisitionPipelineControl\" ADD COLUMN IF NOT EXISTS \"optimizationState\" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS \"AcquisitionMessage_deliveredAt_idx\" ON \"AcquisitionMessage\"(\"deliveredAt\");
CREATE INDEX IF NOT EXISTS \"AcquisitionMessage_copyVersion_idx\" ON \"AcquisitionMessage\"(\"copyVersion\");
"
docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker
sleep 20
docker compose -p sendfable -f docker-compose.prod.yml ps
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker npx tsx scripts/vps-conversion-status.ts
