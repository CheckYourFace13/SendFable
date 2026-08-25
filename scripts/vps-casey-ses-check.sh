#!/bin/bash
set -euo pipefail
cd /opt/sendfable
set -a
# shellcheck disable=SC1091
source <(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION)=' .env | sed 's/\r$//')
set +a
REGION="${AWS_REGION:-us-east-1}"
echo "REGION=$REGION"
echo "=== casey@sendfable.com ==="
aws sesv2 get-email-identity --email-identity casey@sendfable.com --region "$REGION" --query '{Verified:VerifiedForSendingStatus,Status:VerificationStatus}' --output json 2>&1 || true
echo "=== sendfable.com domain ==="
aws sesv2 get-email-identity --email-identity sendfable.com --region "$REGION" --query '{Verified:VerifiedForSendingStatus,Status:VerificationStatus}' --output json 2>&1 || true
echo "=== acquisition from env ==="
grep -E '^SENDFABLE_ACQUISITION_' .env | cut -d= -f1 || echo 'none'
