# ReviewMyStore.ai Software Architecture Specification
# Part 4 — Super Admin, Platform Operations & SaaS Foundation

## Super Admin

### Objective

Provide complete platform control for ReviewMyStore.ai.

Route:

/admin

Accessible only to users with role = SUPER_ADMIN.

---

## Admin Dashboard

### KPI Cards

- Total Organizations
- Total Businesses
- Active Campaigns
- QR Scans Today
- NFC Taps Today
- AI Reviews Generated
- Active Users
- New Signups
- Pending Orders

---

## User Management

Capabilities:

- View Users
- Search
- Filter
- Suspend
- Reactivate
- Reset Password (future)
- Delete User (soft delete)
- View Businesses

User fields:

- Name
- Email
- Organization
- Status
- Last Login
- Created Date

---

## Organization Management

View every organization.

Actions:

- Create
- Edit
- Suspend
- Delete
- View Analytics
- View Businesses

---

## Business Management

View all businesses across the platform.

Actions:

- Edit
- Archive
- Suspend
- Delete
- Open Review Page
- View Campaigns

---

## Orders & Fulfillment

Purpose:

Manage physical ReviewMyStore.ai products.

Workflow:

Order Created
→ Payment Confirmed
→ QR Generated
→ NFC Encoded
→ Packed
→ Shipped
→ Delivered

Each order stores:

- Customer
- Shipping Address
- Tracking Number
- QR Assignment
- NFC Assignment

---

## QR Inventory

Track:

- Generated
- Assigned
- Printed
- Active

---

## NFC Inventory

Track:

- UID
- Assigned Campaign
- Status
- Last Tap

Actions:

- Activate
- Disable
- Reassign

---

## Platform Analytics

Charts:

- Daily Signups
- Monthly Growth
- AI Requests
- QR Activity
- NFC Activity
- Review Generations

---

## AI Usage

Metrics:

- Requests Today
- Requests This Month
- Failures
- Average Response Time
- Estimated Cost
- Top Organizations

Future:

Token tracking.

---

## Audit Logs

Log:

- Login
- Logout
- Business Created
- Campaign Deleted
- QR Generated
- NFC Assigned
- Admin Action

Every log includes:

- Timestamp
- User
- Organization
- IP
- Request ID

---

## Platform Settings

Editable:

- Platform Name
- Logo
- Maintenance Mode
- Registration Enabled
- Gemini Model
- Default Theme
- Default Plan

---

## Subscription Architecture (Stripe Ready)

Plans:

Starter

- 1 Business
- 3 Campaigns
- 200 AI Reviews / Month

Growth

- 5 Businesses
- Unlimited Campaigns
- 2000 AI Reviews

Pro

- Unlimited Businesses
- Unlimited Campaigns
- Priority AI
- Advanced Analytics

Enterprise

- Custom Limits
- Dedicated Support
- White Label (future)

Database fields:

- plan
- status
- renewal_date
- ai_quota
- businesses_limit

---

## SaaS Metrics

Track:

- MRR
- ARR
- Churn
- Active Organizations
- Trial Conversions
- Average AI Usage
- Average Campaigns per Business

---

## Security

- Helmet
- Rate Limiting
- CORS
- Zod Validation
- SQL Injection Protection
- XSS Protection
- Secure Secrets
- RBAC Enforcement

Super Admin endpoints must never be accessible to Business Owners.

---

## Acceptance Criteria

- Admin can manage all organizations.
- Admin can manage all users.
- Admin can oversee orders.
- Admin can monitor AI usage.
- Platform settings configurable.
- Subscription model ready.
- Audit logging operational.
- Ready for Part 5 (API, UI System & Engineering Standards).

**End of Part 4**
