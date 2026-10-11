#!/bin/bash
set -eu
cd /opt/sendfable
od -c scripts/deploy-production.sh | head -n 5
echo =====
sed -n '43,45p' scripts/deploy-production.sh | od -c | head
