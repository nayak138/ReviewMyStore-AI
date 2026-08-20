---
name: OpenAI SDK captures fetch at construction
description: Why patching globalThis.fetch in a test before() hook is too late for OpenAI/OpenRouter clients.
---

# OpenAI SDK binds `fetch` when the client is constructed

Rule: the OpenAI SDK does `this.fetch = options.fetch ?? getDefaultFetch()`
in its constructor, capturing whatever `globalThis.fetch` is at that moment.
The workspace OpenRouter client (`@workspace/integrations-openrouter-ai`)
constructs its client at module import, so any test that statically imports a
service using it captures the REAL fetch before a `before()` hook can patch it
— tests then silently hit the real API (symptom: seconds of latency instead of
milliseconds).

**Why:** discovered when a service test's "faked" AI draft call actually
reached OpenRouter despite a patched fetch in `before()`.

**How to apply:** patch `globalThis.fetch` in a side-effect module and import
it as the FIRST import of the test file, before any import chain that reaches
the OpenAI client. See `artifacts/api-server/src/testSupport/fakeProviderFetch.ts`
(also fakes BNDLE and records calls). Services that call bare `fetch(...)` at
request time (e.g. BNDLE requests) resolve the global lazily and are safe to
patch in hooks; only import-time client construction is the trap.
