# ReviewMyStore.ai Software Architecture Specification
## Part 2 — Core Architecture, Database & Authentication

> Continuation of Part 1.

# Chapter 2 — Core System Architecture

## Architecture Philosophy

ReviewMyStore.ai is built as a modular multi-tenant SaaS.

Core principles:

- Mobile-first
- Backend owns business logic
- AI requests go through backend only
- Strict tenant isolation
- Modular services

## High-Level Architecture

Browser
↓
React
↓
Express REST API
↓
Business Services + AI Service
↓
PostgreSQL (Drizzle ORM) + Google Gemini

## Core Modules

- Authentication
- Organizations
- Members
- Businesses
- Campaigns
- QR Codes
- NFC Devices
- Customer Review Flow
- AI Review Generation
- Analytics
- Orders
- Super Admin
- Audit Logs
- Settings

## Folder Structure

```text
src/
  api/
  controllers/
  middleware/
  services/
  repositories/
  routes/
  db/
  schema/
  validation/
  components/
  pages/
  hooks/
  utils/
  types/
```

## Multi-Tenant Model

Organization
→ Members
→ Businesses
→ Campaigns
→ QR Codes / NFC Devices
→ Review Pages
→ Analytics

## Database Tables

### organizations
- id
- name
- slug
- created_at
- updated_at

### users
- id
- organization_id
- name
- email
- password_hash
- role
- status
- last_login
- created_at

### businesses
- id
- organization_id
- business_name
- slug
- google_place_id
- logo_url
- cover_url
- primary_color
- welcome_message

### campaigns
- id
- business_id
- name
- status

### keywords
- id
- campaign_id
- keyword
- category
- display_order

Categories:
- Product
- Service
- Experience

### qr_codes
- id
- campaign_id
- name
- destination_url
- scans

### nfc_devices
- id
- campaign_id
- uid
- name
- status
- last_scan

### review_generations
- id
- campaign_id
- generated_review
- selected_keywords
- custom_keywords
- copied
- redirected
- session_id

### analytics_events

Track:
- QR_SCANNED
- NFC_TAPPED
- PAGE_OPENED
- KEYWORD_SELECTED
- REVIEW_GENERATED
- REVIEW_EDITED
- REVIEW_COPIED
- GOOGLE_REDIRECT

### audit_logs

Track:
- Login
- Business Created
- Campaign Deleted
- QR Generated
- NFC Disabled

### orders

Track:
- Customer
- Business
- Quantity
- Status
- Tracking Number

Statuses:
- Pending
- Printing
- Encoding
- Packed
- Shipped
- Delivered

# Authentication

Only Super Admin and Business Owners authenticate.

Customers never create accounts.

JWT + Refresh Tokens.

bcrypt password hashing.

RBAC enforced on every protected route.

# RBAC

Super Admin:
- Full platform access

Business Owner:
- Own organization only

Customer:
- Public review pages only

# Validation

Use Zod on every API.

Validate:
- Email
- Password
- UUID
- Slug
- Google Place ID
- Campaign Name
- Keyword Length

# Engineering Standards

- TypeScript only
- Thin controllers
- Business logic in services
- Repository pattern
- Environment validation
- No secrets in frontend

# Acceptance Criteria

- Organizations support multiple Businesses.
- Businesses support multiple Campaigns.
- Campaigns support QR & NFC assets.
- Tenant isolation enforced.
- Authentication complete.
- RBAC implemented.
- Ready for Customer Review Flow (Part 3).
