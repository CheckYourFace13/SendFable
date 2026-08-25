#!/bin/bash
set -euo pipefail
cd /opt/sendfable
echo "HEAD=$(git rev-parse HEAD)"
echo "=== acquisition/env (keys only) ==="
grep -E '^(SENDFABLE_ACQUISITION_|PLATFORM_SEND_DOMAIN|OWNER_ALERT_EMAIL|AWS_REGION|SES_CONFIGURATION_SET)=' .env | cut -d= -f1 || true
echo "=== from values (safe) ==="
grep -E '^SENDFABLE_ACQUISITION_FROM=' .env || echo 'SENDFABLE_ACQUISITION_FROM=UNSET'
grep -E '^PLATFORM_SEND_DOMAIN=' .env || echo 'PLATFORM_SEND_DOMAIN=UNSET'
grep -E '^SENDFABLE_ACQUISITION_IMAP_' .env | cut -d= -f1 || echo 'IMAP=UNSET'
# SES identity check if AWS CLI present
if command -v aws >/dev/null 2>&1; then
  echo "=== SES email identities (names only) ==="
  aws sesv2 list-email-identities --region "${AWS_REGION:-us-east-1}" --query 'EmailIdentities[].IdentityName' --output text 2>/dev/null | tr '\t' '\n' | head -40 || echo 'ses_list_failed'
fi
