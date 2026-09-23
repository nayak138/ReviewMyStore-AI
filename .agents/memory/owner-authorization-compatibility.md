---
name: Owner authorization compatibility
description: Compatibility rule for rolling out business-team tables alongside existing owner accounts.
---

Owner authorization checks should use the existing organization/business relationship directly and only query membership tables for TEAM_MEMBER requests.

**Why:** Existing development and test databases can be ahead of application code but behind additive team tables during a staged rollout. Making owners depend on new membership relations causes unrelated owner routes to fail before the schema is ready, while team access still remains deny-by-default until those tables exist.

**How to apply:** Branch owner and team-member authorization paths before joining team tables. Keep the publish/schema-readiness gate in place before enabling TEAM_MEMBER login in a deployed release.