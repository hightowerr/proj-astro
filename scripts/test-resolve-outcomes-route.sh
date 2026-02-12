#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

read_env_var() {
  local key="$1"
  if [[ -f "${ENV_FILE}" ]]; then
    sed -n "s/\r$//;s/^${key}[[:space:]]*=[[:space:]]*//p" "${ENV_FILE}" \
      | head -n1 \
      | sed -E "s/^[[:space:]]+//;s/[[:space:]]+$//;s/^\"(.*)\"$/\1/;s/^'(.*)'$/\1/"
  fi
}

POSTGRES_URL_VALUE="${POSTGRES_URL:-$(read_env_var POSTGRES_URL)}"
CRON_SECRET_VALUE="${CRON_SECRET:-$(read_env_var CRON_SECRET)}"

if [[ -z "${POSTGRES_URL_VALUE}" ]]; then
  echo "POSTGRES_URL is required (set it in env or .env)."
  exit 1
fi

if [[ -z "${CRON_SECRET_VALUE}" ]]; then
  echo "CRON_SECRET is required (set it in env or .env)."
  exit 1
fi

export POSTGRES_URL="${POSTGRES_URL_VALUE}"
export CRON_SECRET="${CRON_SECRET_VALUE}"

pnpm test src/app/api/jobs/resolve-outcomes/route.test.ts --run "$@"
