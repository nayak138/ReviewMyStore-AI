# ReviewMyStore.ai Software Architecture Specification
# Part 5 — API Specification, UI System & Engineering Standards

## API Design Principles

- RESTful endpoints
- JSON request/response
- Version under `/api/v1`
- Zod validation on every request
- Standard success/error envelope
- JWT authentication for protected routes

### Success Response

```json
{
  "success": true,
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Readable error message"
}
```

---

# Authentication API

POST /api/v1/auth/register

POST /api/v1/auth/login

POST /api/v1/auth/logout

POST /api/v1/auth/refresh

GET /api/v1/auth/me

---

# Business API

GET /api/v1/businesses

POST /api/v1/businesses

GET /api/v1/businesses/:id

PUT /api/v1/businesses/:id

DELETE /api/v1/businesses/:id

---

# Campaign API

CRUD endpoints for campaigns.

Nested under Business ownership.

---

# Keywords API

CRUD endpoints.

Bulk create.

Reorder endpoint.

---

# AI API

POST /api/v1/reviews/generate

POST /api/v1/reviews/regenerate

Input:
- businessId
- campaignId
- keywords
- customKeywords

Output:
- generatedReview

---

# QR API

Generate QR

Download PNG

Download SVG

Track Scan

---

# NFC API

Register Device

Assign Device

Disable

Activate

Track Tap

---

# Analytics API

Overview

Funnels

Campaign Analytics

Business Analytics

Platform Analytics (Admin)

---

# Frontend Page Map

Public

/

Features

Pricing

Login

Register

/review/:businessSlug/:campaignSlug

Business

/dashboard

/businesses

/campaigns

/analytics

/orders

/settings

Admin

/admin

/admin/users

/admin/organizations

/admin/orders

/admin/settings

---

# UI Design Language

Style Goals

- Premium
- Minimal
- Fast
- Clean

Inspiration

- Stripe
- Linear
- Vercel
- Notion

---

# Design Tokens

Radius

- Small
- Medium
- Large

Spacing

4
8
12
16
24
32
48

Typography

Heading

Body

Caption

Button

---

# Core Components

Buttons

Cards

Metric Cards

Charts

Tables

Dialogs

Forms

Inputs

Select

Combobox

Keyword Chips

Toast

Skeleton Loader

Empty State

---

# Mobile UX

Customer flow must be usable with one hand.

Large tap targets.

Sticky CTA.

Minimal scrolling.

---

# State Management

React Query

Context for authentication

Local component state for UI

Avoid unnecessary global state.

---

# Coding Standards

- TypeScript strict mode
- ESLint
- Prettier
- Reusable components
- No duplicated business logic
- Services > Controllers > Repositories

---

# Performance

Lazy load routes.

Optimize images.

Memoize expensive components.

Paginate admin tables.

Cache analytics queries.

---

# Deployment Checklist

- Environment variables configured
- Database migrations applied
- Build passes
- No console errors
- Production mode enabled
- HTTPS enabled
- Health endpoint responding

---

# Replit Agent Build Order

1. Project bootstrap
2. Database & Drizzle
3. Authentication
4. Business module
5. Campaign module
6. Customer review flow
7. Gemini integration
8. QR module
9. NFC module
10. Analytics
11. Orders
12. Super Admin
13. Polish UI
14. Production deployment

Each milestone must compile successfully before the next begins.

---

# Final Engineering Principles

- Build incrementally.
- Preserve architecture.
- Never duplicate code.
- Prefer composition over inheritance.
- Validate all input.
- Log important events.
- Keep APIs backward compatible.

**End of Part 5**
