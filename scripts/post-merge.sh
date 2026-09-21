#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db exec drizzle-kit push \
  --force \
  --config ./drizzle.config.ts \
  --tablesFilter social_media_provider_teams
