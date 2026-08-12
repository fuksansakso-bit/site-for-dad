# Phase 2B — Polza Gemini AI window visualization plan

## Status and verifiable outcome

- **Status:** ACTIVE
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

1. **IN PROGRESS — Authorization and contracts:** record the owner decision/ADR, supersede conflicting geometry-first requirements, update the active plan, external-source/privacy/rights boundaries and Phase 2B quality gate.
2. **PENDING — Data/storage:** additive Supabase migration for jobs, attempts, settings, rate events, optional order linkage, private buckets, indexes, RLS and cleanup functions.
3. **PENDING — Upload/API:** HttpOnly guest ownership, safe image preprocessing/validation, exact-path signed direct upload and public/admin contracts with origin, rate, idempotency and safe errors.
4. **PENDING — Provider/lifecycle:** closed prompt, Polza adapter, async state mapping, provider result import, limits, retry, status and cleanup.
5. **PENDING — Product surfaces:** responsive five-state `/visualizer`, owned result route, catalog/detail/calculator/cart/request entry points, before/after and deletion.
6. **PENDING — Administration:** safe statistics, filters, kill switch/limits, audited image access, manual cleanup and OWNER/ADMIN/MANAGER boundaries.
7. **PENDING — Verification:** unit/integration/static RLS/security/browser/mobile/recovery gates, production/Vercel build, secret/client-bundle scans and bounded live QA only if credentials exist.
8. **PENDING — Completion:** synchronize only related specifications, traceability, open questions, live QA, completion report and changelog; clean tree, push and Draft PR without merge or Phase 2C.

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
9. `test: verify Polza visualization security and flow`
10. `docs: complete Phase 2B Gemini visualization`

## Stop conditions and decisions

- Stop if private direct upload, ownership/RLS, safe provider output import or server-only credentials cannot be proven without expanding the architecture.
- Missing Polza key is not a stop: complete implementation and mocks with status `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`.
- Missing Supabase cloud credentials permit migration/static/mock verification only; do not claim remote buckets/RLS/cron activation.
- Commercial production remains fail-closed on unresolved provider-contract/privacy/legal gates.
- The Product Owner explicitly selected Polza, four family prompt profiles, 1K/one output, 24-hour default retention, two successful guest generations/day, one active job/guest and future four-point correction only after Phase 2B.
