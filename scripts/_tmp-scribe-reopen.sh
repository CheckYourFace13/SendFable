#!/bin/bash
set -eu
docker exec -i sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 <<'SQL'
UPDATE "MarketingAutopilotDraft"
SET status = 'AWAITING_APPROVAL', "decidedAction" = NULL, "decidedAt" = NULL
WHERE id = 'scribeqadraft20261011';
SELECT id, status, "campaignId" FROM "MarketingAutopilotDraft" WHERE id = 'scribeqadraft20261011';
SQL
