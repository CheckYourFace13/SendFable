#!/bin/bash
set -eu
docker exec -i sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "Campaign" (
  id, "workspaceId", name, status, channel, subject, "simpleMode",
  "audienceType", "audienceTagIds", "createdAt", "updatedAt"
) VALUES (
  'scribeqacamp20261011',
  'cms0kvs9k00033gne6uxqvnu2',
  'Scribe QA — do not send',
  'DRAFT',
  'EMAIL',
  'Scribe QA — do not send',
  true,
  'all',
  '[]'::jsonb,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

UPDATE "MarketingAutopilotDraft"
SET "campaignId" = 'scribeqacamp20261011', status = 'AWAITING_APPROVAL'
WHERE id = 'scribeqadraft20261011';

SELECT d.id, d.status, d."campaignId", c.status AS campaign_status, c."scheduledAt", c."sentAt"
FROM "MarketingAutopilotDraft" d
LEFT JOIN "Campaign" c ON c.id = d."campaignId"
WHERE d.id = 'scribeqadraft20261011';
SQL
