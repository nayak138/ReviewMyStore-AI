#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/scripts exec tsx ensure-social-media-provider-teams.ts
