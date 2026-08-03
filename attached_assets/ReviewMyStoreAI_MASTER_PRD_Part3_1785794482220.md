# ReviewMyStore.ai Software Architecture Specification
# Part 3 — Business Modules, Customer Flow & AI

## Business Dashboard

### Objective
Provide business owners with a single place to manage locations, campaigns, QR/NFC assets and analytics.

### Dashboard Cards
- Total Businesses
- Active Campaigns
- QR Scans
- NFC Taps
- AI Reviews Generated
- Google Redirect Clicks
- Conversion Rate

### Navigation
- Dashboard
- Businesses
- Campaigns
- QR Codes
- NFC Devices
- Analytics
- Orders
- Settings
- Profile

---

## Business Management

Each Business contains:

- Branding
- Google Place ID
- Campaigns
- Review Page
- Analytics

### Business Actions

- Create
- Edit
- Archive
- Delete
- Duplicate (future)

Validation:
- Unique slug
- Valid Google Place ID
- Required business name

---

## Campaign Module

Campaigns are the operational unit.

Examples:
- Reception
- Table 1
- Checkout Counter
- Waiting Area

Each campaign owns:
- Landing Page
- Keywords
- QR Codes
- NFC Devices
- Analytics

Status:
- Draft
- Active
- Archived

---

## Customer Review Flow

Route:

/review/:businessSlug/:campaignSlug

### Step 1

Load campaign.

Validate:
- Campaign exists
- Business active
- Campaign active

Log:
PAGE_OPENED

---

### Step 2

Display:

- Business Logo
- Business Name
- Welcome Message
- Keyword Chips

Allow:
- Multi-select
- Custom keyword

Log:
KEYWORD_SELECTED

---

### Step 3

Generate Review

POST /api/reviews/generate

Payload

{
 businessId,
 campaignId,
 keywords,
 customKeywords
}

Backend Responsibilities

- Validate request
- Load business
- Build Gemini prompt
- Call Gemini
- Store review_generation
- Return review

---

## Gemini Prompt

System Prompt:

You are helping a customer write a genuine Google review.

Requirements:

- Natural language
- 2–3 sentences
- Mention selected keywords
- No emojis
- No hashtags
- No fake claims
- No exaggerated marketing language
- Never mention AI

---

## Step 4

Display editable textarea.

Features:
- Character counter
- Copy button
- Regenerate button (limit 3)
- Edit freely

---

## Step 5

Copy & Redirect

Workflow

1. Copy review to clipboard
2. Success toast
3. Track REVIEW_COPIED
4. Wait 300ms
5. Redirect to:

https://search.google.com/local/writereview?placeid={google_place_id}

Track:
GOOGLE_REDIRECT

---

## AI Safety Rules

Reject prompts attempting:
- Abuse
- Hate speech
- Illegal content
- Fake reviews for unrelated businesses

If generation fails:
- Retry once
- Return friendly error
- Allow manual retry

---

## Analytics Events

Capture:

- PAGE_OPENED
- KEYWORD_SELECTED
- REVIEW_GENERATED
- REVIEW_REGENERATED
- REVIEW_EDITED
- REVIEW_COPIED
- GOOGLE_REDIRECT

Store:
- campaign_id
- business_id
- timestamp
- session_id
- device_type
- browser
- country (future)

---

## Orders Module

Business Owner can:

- View Orders
- Track Shipment
- View Assigned QR
- View Assigned NFC

Statuses:
Pending
Printing
Encoding
Packed
Shipped
Delivered

---

## Notifications

Toast notifications only for MVP.

Examples:

- Business Created
- Campaign Saved
- Review Generated
- Review Copied
- QR Downloaded

---

## Acceptance Criteria

✓ Business owner manages multiple businesses.
✓ Campaigns manage QR & NFC assets.
✓ Customer generates AI review.
✓ Review is editable.
✓ Clipboard works.
✓ Redirect opens Google Review page.
✓ Analytics events recorded.
✓ Ready for Super Admin implementation.

**End of Part 3**
