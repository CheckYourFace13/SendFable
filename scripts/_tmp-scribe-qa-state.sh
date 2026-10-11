#!/bin/bash
set -eu
docker exec -i sendfable-postgres psql -U sendfable -d sendfable -c "select id, status, \"decidedAction\", \"campaignId\" from \"MarketingAutopilotDraft\" where id = 'scribeqadraft20261011';"
docker exec -i sendfable-postgres psql -U sendfable -d sendfable -c "select id, status, \"scheduledAt\", \"sentAt\", \"recipientCount\" from \"Campaign\" where id = 'scribeqacamp20261011';"
