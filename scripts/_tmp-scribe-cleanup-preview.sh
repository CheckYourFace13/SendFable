#!/bin/bash
set -eu
docker exec -i sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 <<'SQL'
SELECT id, status, "campaignId", "configId" FROM "MarketingAutopilotDraft" WHERE id = 'scribeqadraft20261011' OR "campaignId" = 'scribeqacamp20261011';
SELECT id, status, "scheduledAt", "sentAt", "recipientCount" FROM "Campaign" WHERE id = 'scribeqacamp20261011';
SELECT c.id, c.enabled, (SELECT count(*) FROM "MarketingAutopilotDraft" d WHERE d."configId" = c.id) AS drafts
FROM "MarketingAutopilotConfig" c
WHERE c.id = 'scribeqacfg20261011' OR c."workspaceId" = 'cms0kvs9k00033gne6uxqvnu2';
SELECT id, "userId", "workspaceId", role FROM "Membership" WHERE id = 'scribeqaowner20261011';
SQL
