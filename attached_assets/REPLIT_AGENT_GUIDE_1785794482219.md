# REPLIT_AGENT_GUIDE.md

# ReviewMyStore.ai
## Build Instructions for Replit Agent

## Mission

Build a production-ready, multi-tenant SaaS named ReviewMyStore.ai that helps businesses generate more Google Reviews using AI-powered review generation, QR codes, and NFC-enabled standees.

Follow the accompanying Software Architecture Specification.

---

# Core Rules

- Use TypeScript everywhere.
- Use React + Tailwind CSS + shadcn/ui.
- Use Express + Drizzle ORM + PostgreSQL.
- Use Zod validation.
- Keep controllers thin.
- Put business logic in services.
- Never expose secrets to the frontend.
- Build incrementally.
- Complete one milestone before moving to the next.

---

# Milestone 1 — Foundation

- Project bootstrap
- Database
- Drizzle ORM
- Authentication scaffolding
- Folder structure

Acceptance:
- App runs
- Database connected
- Build succeeds

---

# Milestone 2 — Authentication

- Register
- Login
- JWT
- Refresh Tokens
- RBAC
- Organizations

Acceptance:
- Protected routes
- Password hashing
- Role enforcement

---

# Milestone 3 — Business Management

- CRUD Businesses
- Branding
- Google Place ID
- Slugs

---

# Milestone 4 — Campaigns

- CRUD Campaigns
- Keywords
- QR/NFC assignment

---

# Milestone 5 — Customer Review Flow

- Public landing page
- Keyword selection
- Gemini review generation
- Editable review
- Copy to clipboard
- Redirect to Google Review

---

# Milestone 6 — QR & NFC

- QR generation
- NFC management
- Analytics

---

# Milestone 7 — Analytics

- Dashboard
- Funnels
- Campaign analytics

---

# Milestone 8 — Orders

- Order management
- Fulfilment
- Shipping tracking

---

# Milestone 9 — Super Admin

- User management
- Organization management
- AI usage
- Audit logs
- Platform settings

---

# Milestone 10 — Production

- Testing
- Security review
- Performance
- Deployment

---

# Working Rules

- Never rewrite working modules unnecessarily.
- Run the build after every milestone.
- Fix errors before continuing.
- Keep APIs backward compatible.
- Prefer reusable components.
- Commit code after each completed milestone.

---

# Definition of Done

The MVP is complete when:

- Authentication works
- Businesses manage campaigns
- AI review generation works
- QR & NFC work
- Analytics are available
- Super Admin dashboard is operational
- Application deploys successfully
