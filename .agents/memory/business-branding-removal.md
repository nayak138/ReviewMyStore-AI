---
name: Business branding removal
description: The owner-branding feature was removed from runtime contracts and usage without deleting existing stored values.
---

The four legacy business-branding columns are intentionally retained as nullable database storage, while the API, frontend, QR generation, public review response, and storage access paths no longer expose or use them.

**Why:** Removing the columns would irreversibly delete existing logo, cover, color, and welcome-message values; the requested feature removal did not require destructive data deletion.

**How to apply:** Do not reintroduce these fields into API contracts or runtime behavior. Only drop the legacy columns after the owner explicitly approves permanent data deletion and the retention impact is understood.