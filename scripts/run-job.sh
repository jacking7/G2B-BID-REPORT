#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <base-url> <job: collect|send> [userId]" >&2
  exit 1
fi

BASE_URL="$1"
JOB="$2"
USER_ID="${3:-}"
TOKEN="${INTERNAL_JOB_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "INTERNAL_JOB_TOKEN 환경변수가 필요합니다." >&2
  exit 1
fi

BODY='{}'
if [[ -n "$USER_ID" ]]; then
  BODY="{\"userId\":\"$USER_ID\"}"
fi

curl --fail --silent --show-error \
  -X POST "${BASE_URL%/}/api/jobs/${JOB}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY"

echo
