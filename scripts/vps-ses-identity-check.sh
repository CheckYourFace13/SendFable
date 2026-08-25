#!/bin/bash
set -euo pipefail
cd /opt/sendfable
# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source <(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION)=' .env | sed 's/\r$//')
set +a
REGION="${AWS_REGION:-us-east-1}"
echo "REGION=$REGION"
echo "=== identities ==="
aws sesv2 list-email-identities --region "$REGION" --query 'EmailIdentities[].IdentityName' --output text 2>&1 | tr '\t' '\n' | head -60
echo "=== chris@sendfable.com ==="
aws sesv2 get-email-identity --email-identity chris@sendfable.com --region "$REGION" --output json 2>&1 | head -c 1500 || true
echo
echo "=== sendfable.com ==="
aws sesv2 get-email-identity --email-identity sendfable.com --region "$REGION" --query '{Verified:VerifiedForSendingStatus,Dkim:DkimAttributes.Status}' --output json 2>&1 || true
echo "=== send.sendfable.com ==="
aws sesv2 get-email-identity --email-identity send.sendfable.com --region "$REGION" --query '{Verified:VerifiedForSendingStatus,Dkim:DkimAttributes.Status}' --output json 2>&1 || true
