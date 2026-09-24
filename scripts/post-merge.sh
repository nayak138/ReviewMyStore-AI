#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/scripts exec tsx ensure-social-media-provider-teams.ts
pnpm --filter @workspace/scripts run ensure-shared-provider-usage-schema
pnpm --filter @workspace/scripts run ensure-team-schema
pnpm --filter @workspace/scripts run verify-team-schema
