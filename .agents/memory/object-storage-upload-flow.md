---
name: Object storage upload flow (web)
description: The presigned-URL upload pattern used by lib/object-storage-web's useUpload hook and how frontend components should consume it.
---

`useUpload()` (from `@workspace/object-storage-web`) implements a two-step presigned-URL flow: it POSTs file metadata (name/size/contentType) to `${basePath}/uploads/request-url` (default basePath `/api/storage`) to get back `{ uploadURL, objectPath, metadata }`, then PUTs the raw file directly to `uploadURL`. It exposes `uploadFile`, `isUploading`, `progress`, and `error`.

**Why:** avoids routing file bytes through the app server; only the presigned URL request/response and final `objectPath` touch app code.

**How to apply:** frontend upload components should call `uploadFile(file)` and store only the returned `objectPath` (a string) in form state / send it to the API — never construct a full URL manually, and never try to upload the raw file through a JSON API. This is the pattern used by the shared `FileUpload` component in reviewmystore.
