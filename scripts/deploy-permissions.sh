#!/usr/bin/env bash
# create-amplify-deploy-role.sh
# Creates the IAM role and policy for GitHub Actions Amplify deployments

set -euo pipefail

ACCOUNT_ID="${ACCOUNT_ID}"
ROLE_NAME="GitHubActions-AmplifyBoardDeploy"
POLICY_NAME="AmplifyBoardDeployPolicy"

# Create the GitHub OIDC provider (idempotent — will error if already exists)
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

# Create the IAM policy
aws iam create-policy \
  --policy-name "$POLICY_NAME" \
  --description "Minimal permissions for deploy-amplify-board.mjs script" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AmplifyDeploy",
        "Effect": "Allow",
        "Action": [
          "amplify:ListApps",
          "amplify:CreateApp",
          "amplify:GetBranch",
          "amplify:CreateBranch",
          "amplify:ListJobs",
          "amplify:GetJob",
          "amplify:StopJob",
          "amplify:CreateDeployment",
          "amplify:StartDeployment",
          "amplify:TagResource",
          "amplify:UntagResource",
          "amplify:ListTagsForResource"
        ],
        "Resource": "*"
      }
    ]
  }'

# Create the IAM role with GitHub OIDC trust (main branch only)
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --description "GitHub Actions role for deploying Amplify board" \
  --max-session-duration 3600 \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": "repo:joezen777/categorysolitaire:ref:refs/heads/main"
          }
        }
      }
    ]
  }'

# Attach the policy to the role
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
