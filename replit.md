# ReviewMyStore.ai

Multi-tenant SaaS that helps local businesses collect more Google Reviews using AI-assisted review drafting, QR codes, and NFC "tap to review" standees.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/reviewmystore run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (Replit-managed Clerk)
- Optional env: `SUPER_ADMIN_EMAILS` — comma-separated emails that get provisioned as platform SUPER_ADMIN on first sign-in instead of getting their own Organization
- Optional env: `CORS_ALLOWED_ORIGINS` — comma-separated exact frontend origins allowed to make credentialed cross-origin requests; same-origin requests remain supported, and unknown browser origins are rejected for preflight/state-changing requests
- Required for object storage: `PRIVATE_OBJECT_DIR` and `PUBLIC_OBJECT_SEARCH_PATHS` — private uploads are finalized by the authenticated uploader, while branding uploads use an explicit public ACL and are served through the ACL-gated public-asset route

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit-managed Clerk (cookie-based sessions on web), bridged to a local `users` table for app-level roles/RBAC
- Validation: Zod v4 (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, Tailwind v4, shadcn/ui, wouter, TanStack Query
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth; run codegen after editing
- `lib/api-zod/src/generated`, `lib/api-client-react/src/generated` — generated Zod schemas + React Query hooks, never hand-edited
- `lib/db/src/schema/` — Drizzle table definitions (`organizations.ts`, `users.ts`)
- `artifacts/api-server/src/routes/` — Express routes, mounted under `/api` (versioned routes like `/v1/auth/me` live under that)
- `artifacts/api-server/src/services/` — business logic (JIT user/org provisioning, admin queries)
- `artifacts/api-server/src/middlewares/requireAuth.ts` — `requireAuth` (Clerk session -> local `appUser`) and `requireRole` (RBAC) middleware
- `artifacts/reviewmystore/` — main web app (public marketing site + authenticated dashboard)

## Architecture decisions

- **Auth is Clerk, authorization is ours.** Clerk owns login/session; on first authenticated request we JIT-provision a local `users` row bridged by `clerkUserId`. App roles (`SUPER_ADMIN`, `OWNER`) and org-scoping live only in Postgres, enforced by `requireAuth`/`requireRole` — never trust Clerk claims for authorization.
- **SUPER_ADMIN bootstrapping** is via an allowlist env var (`SUPER_ADMIN_EMAILS`), checked only at JIT-provisioning time. Anyone else who signs up becomes an `OWNER` with a freshly created Organization (registration is open, no gating in the MVP).
- **Organizations carry future-billing fields** (`plan`, `subscriptionStatus`, `aiQuota`, `businessesLimit`, `startDate`/`renewalDate`/`expiryDate`) even though there's no payment integration yet — a Super Admin manages these manually until Stripe (or similar) is wired up later. `aiQuota` is a lifetime remaining-generation allowance until a billing-period ledger is introduced.
- **`organizationId` is nullable on `users`** — SUPER_ADMIN accounts are platform-wide and not scoped to a tenant; every OWNER must have exactly one Organization.

## Product

Sprints 1–4 (built): project scaffolding, Clerk authentication, Organization/User data model, RBAC (SUPER_ADMIN vs OWNER), public marketing page, branded sign-in/sign-up, authenticated dashboard; Businesses & Campaigns CRUD with Google Places lookup; public customer review page with AI review generation (keyword-driven, generation limits); QR code system (PNG/SVG/print-ready 4×6" PDF per campaign, dynamic short links `/r/{code}`); NFC device management (software-only: register, assign/reassign/unassign, ACTIVE/DISABLED lifecycle — taps only count when a device is ACTIVE); analytics foundation (append-only `scan_events` logging QR scans, NFC taps, and Google click-throughs with UA/geo/referrer); dashboard with real metrics (scans, taps, redirects, top campaigns, recent activity). Future sprints: Advanced Analytics/charts, Orders, Billing/Stripe, Teams, Notifications, Super Admin.

## User preferences

- **Strict sprint-by-sprint approval process.** Build only the current sprint's scope (per the project's milestone breakdown). After finishing a sprint: run the app, fix all TS/build errors, verify it works, then STOP and wait for explicit user approval before starting the next sprint. Never auto-continue past a sprint boundary.
- No Stripe/payment integration in the MVP. Registration is open — any signed-up user gets full access immediately, no plan gating.
- NFC is software-only (no hardware encoding): register/track NFC UIDs, one device per campaign, generate a unique URL per device, "tap" is simulated by opening that URL.
- AI review generation must go through an `AIService` abstraction with a dedicated prompt/template module — never call the AI provider directly from routes/controllers/frontend.

## Gotchas

- The Orval-generated Zod schemas use zod v4 top-level validators (`z.uuid()`, `z.email()`, `z.int()`) — the workspace `zod` catalog version must stay on v4, not v3, or `typecheck:libs` fails.
- After changing `lib/db/src/schema/*` or anything else under `lib/`, run `pnpm -w run typecheck:libs` before typechecking an artifact that depends on it — composite project references need rebuilding first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
