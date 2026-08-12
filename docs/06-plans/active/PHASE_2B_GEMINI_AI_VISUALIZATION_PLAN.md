# Phase 2B — Polza Gemini AI window visualization plan

## Status and verifiable outcome

- **Status:** COMPLETED — `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`
- **Branch:** `phase/2b-gemini-ai-visualization`
- **Baseline:** `49ce3679de28c612662f78273cd265d73221163d`
- **Authorized by:** `OWNER-DECISION-023`, ADR-0014
- **Target outcome:** a guest can choose a real published Supabase material, directly upload a prepared window photo to private Supabase Storage, consent, create one bounded asynchronous Polza Media job, resume status, compare private before/after, attach the safe result reference to the browser cart/request, and delete it. No direct Google API/SDK, SAM, masks, Python/GPU/service, account, final redesign or Phase 2C is added.

## Dependencies and evidence

- Phase 2A is merged in `origin/main`; baseline lint, typecheck, 11 unit tests and production build pass on Node 24.18.1.
- Active application is one Next.js runtime; ordinary `dev/build` does not require Docker.
- Phase 2A schema and completion evidence establish Supabase PostgreSQL/Storage, stable material UUID/slug, catalog images, calculator, browser cart and staff Auth/RLS. Cloud activation is not reproducible in this workspace because Supabase credentials are absent.
- Official Polza Media create/status/model documentation was captured on 2026-08-12 before transport implementation.
- `POLZA_AI_API_KEY`, Supabase cloud credentials and `CRON_SECRET` are absent locally; live Polza and cloud RLS/storage tests therefore remain pending unless credentials become available.

## Work plan

1. **COMPLETED — Authorization and contracts:** owner decision, ADR, superseded boundaries, source/privacy/rights controls and Phase 2B quality gate are recorded.
2. **COMPLETED — Data/storage:** additive jobs/attempts/settings/rate/order schema, private buckets, indexes, RLS and cleanup functions are committed.
3. **COMPLETED — Upload/API:** guest ownership, safe image preparation/validation and exact-path direct signed upload use metadata-only Vercel contracts.
4. **COMPLETED — Provider/lifecycle:** closed prompt, Polza adapter, asynchronous status/result import, limits, retries and safe errors are implemented.
5. **COMPLETED — Product surfaces:** responsive five-state visualizer, before/after, entry points, cart/request linkage and owned deletion are implemented.
6. **COMPLETED — Administration:** safe statistics, filters, kill switch/limits, audited image grants and cleanup respect staff roles.
7. **COMPLETED WITH EXPLICIT SKIPS — Verification:** 49 tests, browser/mobile, lint/type/scope/secret and production build pass; cloud RLS/Storage/cron and live Polza await credentials.
8. **COMPLETED — Completion:** related documentation and the completion report record Draft PR #7, zero live calls and the exact pending-live status; Phase 2C was unstarted at this completion boundary and was authorized only later by `OWNER-DECISION-024`.

Only one item may be `IN PROGRESS`; this file is updated as the phase advances.

## Planned commits

1. `docs: authorize Phase 2B Gemini visualization`
2. `feat: add AI visualization data model and storage`
3. `feat: add secure direct image upload`
4. `feat: add Polza image visualization provider`
5. `feat: add AI visualization job lifecycle`
6. `feat: add responsive AI visualization flow`
7. `feat: integrate AI result with cart and requests`
8. `feat: add AI limits cleanup and administration`
9. `test: verify Gemini visualization security and flow`
10. `docs: complete Phase 2B Gemini visualization`

## Stop conditions and decisions

- Stop if private direct upload, ownership/RLS, safe provider output import or server-only credentials cannot be proven without expanding the architecture.
- Missing Polza key is not a stop: complete implementation and mocks with status `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`.
- Missing Supabase cloud credentials permit migration/static/mock verification only; do not claim remote buckets/RLS/cron activation.
- Commercial production remains fail-closed on unresolved provider-contract/privacy/legal gates.
- The Product Owner explicitly selected Polza, four family prompt profiles, 1K/one output, 24-hour default retention, two successful guest generations/day, one active job/guest and future four-point correction only after Phase 2B.
