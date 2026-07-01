#!/usr/bin/env bash
# setup-oidc.sh — Configura OIDC per GitHub Actions su AWS (dev + prod)
#
# Prerequisiti:
#   aws sso login --profile dev
#   aws sso login --profile prod
#
# Usage:
#   ./infra/setup-oidc.sh
#
# Crea:
#   1. GitHub OIDC Identity Provider (su ogni account, se non esiste)
#   2. IAM Role "github-actions-deploy-dev" con permessi S3 + CloudFront (dev)
#   3. IAM Role "github-actions-deploy-prod" con permessi S3 + CloudFront (prod)
#      + permesso di lettura sul bucket DEV (per la promozione S3→S3)

set -euo pipefail

# ─── CONFIGURAZIONE (modifica questi valori) ─────────────────────────────────
GITHUB_ORG="DinamicaGithub"
GITHUB_REPO="help-in-field"
AWS_REGION="eu-south-1"

# DEV
DEV_PROFILE="dev"
DEV_ROLE_NAME="github-actions-deploy-dev"
DEV_S3_BUCKET="help-in-field-web-dev"
DEV_CF_DISTRIBUTION_ID="EXXXXXXXXXX_DEV"    # ← Sostituisci

# PROD
PROD_PROFILE="prod"
PROD_ROLE_NAME="github-actions-deploy-prod"
PROD_S3_BUCKET="help-in-field-web"
PROD_CF_DISTRIBUTION_ID="EXXXXXXXXXX_PROD"  # ← Sostituisci
# ──────────────────────────────────────────────────────────────────────────────

GITHUB_OIDC_URL="https://token.actions.githubusercontent.com"
# GitHub's TLS certificate thumbprint (stable)
GITHUB_OIDC_THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

echo "═══════════════════════════════════════════════════════════════"
echo " Setup OIDC — GitHub Actions → AWS"
echo " Repo: $GITHUB_ORG/$GITHUB_REPO"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Helpers ──────────────────────────────────────────────────────────────────

get_account_id() {
  aws sts get-caller-identity --profile "$1" --query "Account" --output text
}

ensure_oidc_provider() {
  local profile="$1"
  echo "[$profile] Checking OIDC provider..."

  local arn
  arn=$(aws iam list-open-id-connect-providers --profile "$profile" \
    --query "OpenIDConnectProviderList[?ends_with(Arn,'token.actions.githubusercontent.com')].Arn" \
    --output text 2>/dev/null || echo "")

  if [[ -n "$arn" && "$arn" != "None" ]]; then
    echo "[$profile] Already exists: $arn"
  else
    echo "[$profile] Creating OIDC provider..."
    arn=$(aws iam create-open-id-connect-provider \
      --url "$GITHUB_OIDC_URL" \
      --client-id-list "sts.amazonaws.com" \
      --thumbprint-list "$GITHUB_OIDC_THUMBPRINT" \
      --profile "$profile" \
      --query "OpenIDConnectProviderArn" \
      --output text)
    echo "[$profile] Created: $arn"
  fi
  echo "$arn"
}

create_role() {
  local profile="$1"
  local role_name="$2"
  local oidc_arn="$3"
  local sub_condition="$4"
  local description="$5"

  echo ""
  echo "[$profile] Role: $role_name"

  local trust_policy
  trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$oidc_arn"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "$sub_condition"
        }
      }
    }
  ]
}
EOF
)

  if aws iam get-role --role-name "$role_name" --profile "$profile" &>/dev/null; then
    echo "[$profile] Role exists → updating trust policy"
    aws iam update-assume-role-policy \
      --role-name "$role_name" \
      --policy-document "$trust_policy" \
      --profile "$profile"
  else
    aws iam create-role \
      --role-name "$role_name" \
      --assume-role-policy-document "$trust_policy" \
      --description "$description" \
      --profile "$profile" \
      --output text --query "Role.Arn"
    echo "[$profile] Role created"
  fi
}

attach_deploy_policy() {
  local profile="$1"
  local role_name="$2"
  local account_id="$3"
  local s3_bucket="$4"
  local cf_distribution_id="$5"
  local extra_s3_read="${6:-}"  # optional: extra bucket ARN for read access

  local statements
  statements=$(cat <<EOF
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$s3_bucket",
        "arn:aws:s3:::$s3_bucket/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::$account_id:distribution/$cf_distribution_id"
    }
EOF
)

  # If cross-account/cross-bucket read is needed
  if [[ -n "$extra_s3_read" ]]; then
    statements="$statements,"
    statements="$statements
    {
      \"Sid\": \"S3ReadSource\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"s3:GetObject\",
        \"s3:ListBucket\"
      ],
      \"Resource\": [
        \"arn:aws:s3:::$extra_s3_read\",
        \"arn:aws:s3:::$extra_s3_read/*\"
      ]
    }"
  fi

  local policy
  policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    $statements
  ]
}
EOF
)

  echo "[$profile] Attaching deploy policy..."
  aws iam put-role-policy \
    --role-name "$role_name" \
    --policy-name "deploy-s3-cloudfront" \
    --policy-document "$policy" \
    --profile "$profile"
  echo "[$profile] ✅ Policy attached"
}

# ─── MAIN ────────────────────────────────────────────────────────────────────

DEV_ACCOUNT=$(get_account_id "$DEV_PROFILE")
PROD_ACCOUNT=$(get_account_id "$PROD_PROFILE")

echo "DEV  account: $DEV_ACCOUNT"
echo "PROD account: $PROD_ACCOUNT"
echo ""

# 1. OIDC providers
DEV_OIDC_ARN=$(ensure_oidc_provider "$DEV_PROFILE")
PROD_OIDC_ARN=$(ensure_oidc_provider "$PROD_PROFILE")

# 2. DEV role — triggered by any ref in the repo (tag push, workflow_dispatch)
create_role "$DEV_PROFILE" "$DEV_ROLE_NAME" "$DEV_OIDC_ARN" \
  "repo:${GITHUB_ORG}/${GITHUB_REPO}:*" \
  "GitHub Actions deploy role (dev) for $GITHUB_REPO"

attach_deploy_policy "$DEV_PROFILE" "$DEV_ROLE_NAME" "$DEV_ACCOUNT" \
  "$DEV_S3_BUCKET" "$DEV_CF_DISTRIBUTION_ID"

# 3. PROD role — only from "production" environment
create_role "$PROD_PROFILE" "$PROD_ROLE_NAME" "$PROD_OIDC_ARN" \
  "repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:production" \
  "GitHub Actions deploy role (prod) for $GITHUB_REPO"

# PROD needs read on DEV bucket to copy artefacts (same account or cross-account)
attach_deploy_policy "$PROD_PROFILE" "$PROD_ROLE_NAME" "$PROD_ACCOUNT" \
  "$PROD_S3_BUCKET" "$PROD_CF_DISTRIBUTION_ID" "$DEV_S3_BUCKET"

# 4. If cross-account: DEV bucket needs a resource policy allowing PROD role to read
if [[ "$DEV_ACCOUNT" != "$PROD_ACCOUNT" ]]; then
  echo ""
  echo "⚠️  Cross-account detected (DEV=$DEV_ACCOUNT, PROD=$PROD_ACCOUNT)"
  echo "   Adding bucket policy on $DEV_S3_BUCKET to allow PROD role read access..."

  EXISTING_POLICY=$(aws s3api get-bucket-policy --bucket "$DEV_S3_BUCKET" --profile "$DEV_PROFILE" \
    --query "Policy" --output text 2>/dev/null || echo "")

  CROSS_ACCOUNT_STATEMENT=$(cat <<EOF
{
  "Sid": "AllowProdRoleRead",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::${PROD_ACCOUNT}:role/${PROD_ROLE_NAME}"
  },
  "Action": [
    "s3:GetObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::$DEV_S3_BUCKET",
    "arn:aws:s3:::$DEV_S3_BUCKET/*"
  ]
}
EOF
)

  if [[ -z "$EXISTING_POLICY" || "$EXISTING_POLICY" == "None" ]]; then
    BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [$CROSS_ACCOUNT_STATEMENT]
}
EOF
)
  else
    # Append to existing policy
    BUCKET_POLICY=$(echo "$EXISTING_POLICY" | python3 -c "
import json, sys
policy = json.load(sys.stdin)
new_stmt = json.loads('''$CROSS_ACCOUNT_STATEMENT''')
# Remove old statement if exists
policy['Statement'] = [s for s in policy['Statement'] if s.get('Sid') != 'AllowProdRoleRead']
policy['Statement'].append(new_stmt)
print(json.dumps(policy))
")
  fi

  aws s3api put-bucket-policy \
    --bucket "$DEV_S3_BUCKET" \
    --policy "$BUCKET_POLICY" \
    --profile "$DEV_PROFILE"
  echo "   ✅ Bucket policy updated"
fi

# ─── Output ──────────────────────────────────────────────────────────────────

DEV_ROLE_ARN="arn:aws:iam::${DEV_ACCOUNT}:role/${DEV_ROLE_NAME}"
PROD_ROLE_ARN="arn:aws:iam::${PROD_ACCOUNT}:role/${PROD_ROLE_NAME}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✅ SETUP COMPLETATO"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo " Configura gli Environments su GitHub:"
echo " (Settings → Environments)"
echo ""
echo " ┌─────────────────────────────────────────────────────────┐"
echo " │ Environment: dev                                        │"
echo " ├─────────────────────────────────────────────────────────┤"
echo " │ AWS_ROLE_ARN              = $DEV_ROLE_ARN"
echo " │ AWS_REGION                = $AWS_REGION"
echo " │ S3_BUCKET                 = $DEV_S3_BUCKET"
echo " │ CLOUDFRONT_DISTRIBUTION_ID = $DEV_CF_DISTRIBUTION_ID"
echo " │ CLOUDFRONT_DOMAIN         = <il tuo dominio dev>"
echo " └─────────────────────────────────────────────────────────┘"
echo ""
echo " ┌─────────────────────────────────────────────────────────┐"
echo " │ Environment: production  (+ Required Reviewers!)        │"
echo " ├─────────────────────────────────────────────────────────┤"
echo " │ AWS_ROLE_ARN              = $PROD_ROLE_ARN"
echo " │ AWS_ROLE_ARN_DEV          = $DEV_ROLE_ARN"
echo " │ AWS_REGION                = $AWS_REGION"
echo " │ S3_BUCKET                 = $PROD_S3_BUCKET"
echo " │ S3_BUCKET_DEV             = $DEV_S3_BUCKET"
echo " │ CLOUDFRONT_DISTRIBUTION_ID = $PROD_CF_DISTRIBUTION_ID"
echo " │ CLOUDFRONT_DOMAIN         = <il tuo dominio prod>"
echo " └─────────────────────────────────────────────────────────┘"
echo ""
