#!/usr/bin/env bash
# One-time bootstrap: create dedicated backup bucket + IAM user.
# REQUIRES temporary admin credentials in env (NOT the SES user).
# Usage (on VPS, as root):
#   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_DEFAULT_REGION=us-east-1
#   bash /opt/sendfable/scripts/bootstrap-offhost-backup.sh
# Then unset the admin keys. Backup keys are written only to /root/sendfable-backups/backup-iam.env
set -euo pipefail

ACCOUNT_ID="${AWS_ACCOUNT_ID:-911167908678}"
BUCKET="sendfable-db-backups-${ACCOUNT_ID}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
USER_NAME="sendfable-backup"
POLICY_NAME="SendfableBackupS3Only"
AGE_DIR=/root/sendfable-backups
AGE_KEY="$AGE_DIR/age-backup.key"
AGE_PUB="$AGE_DIR/age-backup.pub"

command -v aws >/dev/null || { echo "Install awscli first: apt-get install -y awscli"; exit 1; }
command -v age >/dev/null || { echo "Install age first"; exit 1; }

CALLER=$(aws sts get-caller-identity --query Arn --output text)
echo "Bootstrap caller: $CALLER"
if echo "$CALLER" | grep -q 'sendfable-ses-production'; then
  echo "REFUSING: do not use sendfable-ses-production for bootstrap"
  exit 1
fi

mkdir -p "$AGE_DIR"
chmod 700 "$AGE_DIR"
if [ ! -f "$AGE_KEY" ]; then
  age-keygen -o "$AGE_KEY" > "$AGE_PUB"
  chmod 600 "$AGE_KEY" "$AGE_PUB"
  echo "Generated age keypair"
fi
AGE_RECIPIENT=$(grep '^# public key:' "$AGE_KEY" | awk '{print $4}')
[ -n "$AGE_RECIPIENT" ] || AGE_RECIPIENT=$(cat "$AGE_PUB" | head -1)
echo "age recipient: $AGE_RECIPIENT"

# Bucket
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket exists: $BUCKET"
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  echo "Created bucket $BUCKET"
fi

aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration '{
  "Rules": [
    {"ID":"daily","Status":"Enabled","Filter":{"Prefix":"postgres/daily/"},"Expiration":{"Days":14}},
    {"ID":"weekly","Status":"Enabled","Filter":{"Prefix":"postgres/weekly/"},"Expiration":{"Days":60}},
    {"ID":"monthly","Status":"Enabled","Filter":{"Prefix":"postgres/monthly/"},"Expiration":{"Days":365}}
  ]
}'
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Sid\":\"DenyInsecureTransport\",
    \"Effect\":\"Deny\",
    \"Principal\":\"*\",
    \"Action\":\"s3:*\",
    \"Resource\":[\"arn:aws:s3:::${BUCKET}\",\"arn:aws:s3:::${BUCKET}/*\"],
    \"Condition\":{\"Bool\":{\"aws:SecureTransport\":\"false\"}}
  }]
}"

# IAM user + policy
POLICY_DOC='{
  "Version":"2012-10-17",
  "Statement":[
    {"Sid":"ListPrefix","Effect":"Allow","Action":["s3:ListBucket"],"Resource":"arn:aws:s3:::'$BUCKET'","Condition":{"StringLike":{"s3:prefix":["postgres/*"]}}},
    {"Sid":"Objects","Effect":"Allow","Action":["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:GetObjectTagging","s3:PutObjectTagging"],"Resource":"arn:aws:s3:::'$BUCKET'/postgres/*"}
  ]
}'

aws iam create-user --user-name "$USER_NAME" 2>/dev/null || echo "IAM user exists"
POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)
if [ -z "$POLICY_ARN" ] || [ "$POLICY_ARN" = "None" ]; then
  POLICY_ARN=$(aws iam create-policy --policy-name "$POLICY_NAME" --policy-document "$POLICY_DOC" --query Policy.Arn --output text)
else
  # new version
  aws iam create-policy-version --policy-arn "$POLICY_ARN" --policy-document "$POLICY_DOC" --set-as-default >/dev/null || true
fi
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY_ARN"

# Access key (create once; if exists, leave existing keys alone)
EXISTING=$(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
OUT=/root/sendfable-backups/backup-iam.env
if [ -z "$EXISTING" ]; then
  KEY_JSON=$(aws iam create-access-key --user-name "$USER_NAME")
  AK=$(echo "$KEY_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["AccessKey"]["AccessKeyId"])')
  SK=$(echo "$KEY_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["AccessKey"]["SecretAccessKey"])')
  umask 077
  cat > "$OUT" <<EOF
BACKUP_S3_BUCKET=$BUCKET
BACKUP_S3_REGION=$REGION
BACKUP_S3_PREFIX=postgres
BACKUP_S3_ACCESS_KEY_ID=$AK
BACKUP_S3_SECRET_ACCESS_KEY=$SK
BACKUP_AGE_RECIPIENT=$AGE_RECIPIENT
BACKUP_AGE_KEY_FILE=$AGE_KEY
EOF
  chmod 600 "$OUT"
  echo "Wrote $OUT (chmod 600). Append these to /opt/sendfable/.env then remove this file if desired."
else
  echo "Access key already exists for $USER_NAME ($EXISTING)."
  echo "If .env lacks BACKUP_S3_*, create a new key in console or delete unused keys and re-run."
  grep -q BACKUP_AGE_RECIPIENT "$OUT" 2>/dev/null || cat >> "$OUT" <<EOF
BACKUP_S3_BUCKET=$BUCKET
BACKUP_S3_REGION=$REGION
BACKUP_S3_PREFIX=postgres
BACKUP_AGE_RECIPIENT=$AGE_RECIPIENT
BACKUP_AGE_KEY_FILE=$AGE_KEY
EOF
fi

echo "BOOTSTRAP_OK bucket=$BUCKET user=$USER_NAME"
echo "NEXT: merge BACKUP_* into /opt/sendfable/.env; unset admin AWS keys; run backup.sh"
