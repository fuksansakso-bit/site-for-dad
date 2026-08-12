# Phase 2C — final premium design, typography, motion and ergonomics plan

## Status and verifiable outcome

- **Status:** `IMPLEMENTATION_COMPLETE_OWNER_PREVIEW_PENDING` — agent delivery complete; owner Preview inspection pending
- **Branch:** `phase/2c-final-premium-design`
- **Baseline:** `bdaa053eee6491a9286355707008a39cbac1abff` (`second-github/main`)
- **Safety tag:** `pre-final-design-phase`
- **Authorized by:** `OWNER-DECISION-024` and narrow pricing/catalog amendment `OWNER-DECISION-025`
- **Target repository:** `https://github.com/fuksansakso-bit/site-for-dad.git`
- **Target outcome:** the existing Phase 2B Next.js/Supabase/Polza product receives a complete, original, light-first `PREMIUM INTERIOR TECH` system across every required public and staff route. The narrow pricing repair removes the new-quote 1,500-ruble minimum and every manager-price placeholder, publishes only materials with a versioned AMIGO `FROM` amount plus exact calculator mapping, fixes parent/descendant category projection and calculates a selected material from width/height through a bounded server-only path. Historical snapshots, private-media ownership, all unrelated provider topology and production state remain unchanged.

## Dependencies and fixed decisions

- Phase 2A and the complete Phase 2B implementation are present in target `main`; file content at the protected baseline matches Phase 2B commit `cd62a17be619272a30921ae288e4f15b2de144de`.
- Baseline lint, strict typecheck, 49 web tests and production build passed before UI edits. Final verification uses the available Node 24.19.0 with the pinned pnpm 11.18.0; its +patch drift from pinned Node 24.18.1 is explicit.
- Phase 2B retains `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING` only until its remaining multi-family visual matrix is complete. The 2026-08-13 rights-cleared Zebra case now proves the full private Supabase upload → paid Polza/Gemini job/poll → private result import → 1,500×937 before/after → owned delete path.
- The configured Supabase project passes migrated-schema/public REST/Storage checks and contains the retained admin catalog (19 categories/1,428 materials), active exact public projection (7 groups/1,131 materials, including 137 Zebra), one settings row and 1,371 verified catalog objects. Canonical ignored `apps/web/.env.local`, direct PostgreSQL, OWNER login, exact order rollback and verified DB/Storage backup evidence all pass.
- The light-first palette, Manrope + Cormorant Garamond typography, short first-visit starfield, route inventory, viewport matrix, accessibility target, visual baselines, commit sequence and Preview-only delivery are direct Product Owner decisions.
- Final business brand and logo remain open under `TBD-DESIGN-001`; `PROJECT_NAME` stays an internal codename and MUST NOT appear as the public brand. Preview uses a neutral settings-backed label and the admin warns that the brand must be set before production.
- Existing approved AMIGO catalog media MAY be presented under its registered rights. Portfolio sections MUST render only separately approved real business work and MUST NOT relabel supplier media as the father's portfolio.
- Production promotion, merge, payments, customer accounts, uncontrolled catalog discovery/import, unrelated provider replacement, direct Google API, SAM/masks/segmentation, Python/GPU/worker services and destructive data changes remain outside scope. `OWNER-DECISION-025` permits only dated AMIGO price/mapping verification and the bounded calculator transport/cache required for exact quotes.

## Work plan

1. **COMPLETED — Authorization and preflight:** recorded `OWNER-DECISION-024`, baseline/tag/branch, active plan, QG-601–670, visible blockers and exact Preview/repository boundary; docs validation and baseline lint/typecheck/49 tests/build pass.
2. **COMPLETED — Design foundation:** implemented central color/type/space/radius/shadow/motion tokens, local `next/font`, semantic primitives, presentation mappings and responsive public/admin foundations; lint/typecheck/build and desktop/mobile visual checks pass.
3. **COMPLETED — Intro and landing:** added the bounded first-visit starfield with skip/reduced-motion/weak-device fallbacks, source-backed premium landing, exact approved hero copy, conditional AI/WhatsApp, real published catalog/portfolio content and honest empty states; lint, typecheck, build and 1440/mobile visual review pass.
4. **COMPLETED — Catalog experience:** redesigned listing, deferred search, premium listbox filters, stable sorting, incremental rendering, responsive cards, breadcrumbs and material detail; live exact projection passes 7/1,131 counts with 137 Zebra, real Storage images, no zero/manual public row, broken image, native selector or console error.
5. **COMPLETED — Conversion flow:** redesigned exact calculator, reactive local cart, checkout, request result and WhatsApp handoff; live Zebra 1,000×1,000 → 11,850 ₽ → add-to-cart → server repricing passes, and no synthetic request/PII was submitted.
6. **COMPLETED — AI experience:** rebuilt the five-step visualizer as one premium studio with a connected animated light-flow progress track, source-backed material/photo/consent/generation/result states, dynamic retention notice, pointer/keyboard before-after control, safe disabled/error/deleted recovery and no public codename. Live QA fixed a signed-upload visibility race and Polza's observed single-item result-array contract; a paid rights-cleared Zebra task now passes provider creation/polling, private result import, visible before/after and zero-object owned cleanup. Remaining family-quality coverage is not claimed.
7. **COMPLETED — Exact AMIGO pricing and catalog repair:** activated immutable `amigo-67c782a10449cdb7`; 1,131/1,428 rows are `READY`, 297 are safely excluded, 137 Zebra are live; exact server adapter/cache/order validation, retired minimum, premium material selection and historical snapshots pass.
8. **COMPLETED — Business administration:** Russian login/dashboard/materials/orders/portfolio/settings/staff/AI surfaces use the restrained premium shell, role-safe actions and Russian mappings; requested OWNER login is verified live.
9. **COMPLETED — Responsive and states:** desktop/mobile navigation and relevant loading/empty/error/success/disabled states pass all ten 320–1920 px profiles without horizontal overflow.
10. **COMPLETED — Accessibility and performance:** keyboard premium listbox, focus/semantics, reduced motion, 44 px controls, image/font boundaries and local production lab/build budgets are recorded without field-metric claims.
11. **COMPLETED — Verification:** 6 Node + 55 Vitest tests and six Phase 2C Chromium checks pass, including Zebra exact/cart, upload-confirmation visibility retry, Polza single-result parsing, ten viewports, route safety, keyboard listbox, 13 visual baselines and local lab observations.
12. **COMPLETED — Documentation:** final design/motion/component evidence, exact-price mapping, route audit, release QA, live AI evidence and the 32-item completion report are synchronized with the implementation and explicit non-claims.
13. **COMPLETED — Preview and delivery:** branch/tag are pushed to `second-github`; Draft PR #1 has the exact title and remains unmerged; the target-account Vercel Preview is Ready. The Product Owner explicitly reserved direct Preview inspection, so QG-666/QG-670 remain open until that external review.

Only one item may be `IN PROGRESS`; this file MUST be updated as evidence is produced.

## Planned commits

1. `docs: authorize final premium design phase`
2. `feat: establish final design tokens and typography`
3. `feat: add starfield intro and premium landing`
4. `feat: redesign catalog and material pages`
5. `feat: redesign calculator cart and checkout`
6. `feat: polish AI visualization experience`
7. `feat: unify Russian business administration`
8. `feat: activate exact AMIGO material pricing`
9. `feat: complete responsive navigation and mobile ergonomics`
10. `fix: complete accessibility and interaction states`
11. `perf: optimize final visual experience`
12. `test: add final visual accessibility and route coverage`
13. `docs: complete final design and release polish`
14. `fix: complete real Polza visualization flow`
15. `docs: record target preview and draft PR delivery`

## Verification matrix

- Routes: `/`, `/catalog`, `/catalog/[slug]`, `/calculator`, `/cart`, `/checkout`, `/request/[publicReference]`, `/visualizer`, `/visualizer/[publicReference]`, `/admin/login`, `/admin`, `/admin/materials`, `/admin/orders`, `/admin/portfolio`, `/admin/settings`, `/admin/staff`, `/admin/ai-visualizations`.
- Viewports: `320x568`, `360x800`, `375x812`, `390x844`, `430x932`, `768x1024`, `1024x768`, `1280x800`, `1440x900`, `1920x1080`.
- Browser scenarios: public Zebra/category-to-exact-price-to-request path; no incomplete/manual public material; AI full flow or honest disabled state; staff material availability/price; portfolio governance; mobile `360x800`; keyboard/reduced-motion/offline/error recovery.
- Visual baselines: landing desktop/mobile; catalog desktop/mobile; material desktop/mobile; calculator mobile; cart mobile; visualizer upload/result; admin dashboard/materials; login.
- Quality commands: documentation validation, formatting, lint, strict typecheck, unit/component tests, browser/visual/accessibility suite, production build, secret/artifact/scope scans and Preview smoke.

## Stop conditions and unresolved decisions

- Stop dependent work if code and canonical behavior conflict, if a route would require invented business data, or if rights/provenance cannot distinguish supplier catalog media from owner portfolio work.
- `TBD-PRICE-009` is resolved for the active version; any future row without complete evidence remains excluded instead of receiving an invented formula, mapping or manager fallback.
- Missing remote Supabase or Polza credentials do not block design; do not claim remote/live evidence and render the safe configured state.
- Missing final brand/logo does not block Preview; public UI uses the neutral settings-backed fallback and production remains blocked by `TBD-DESIGN-001`.
- Missing Vercel or GitHub authentication blocks only Preview/publication after all local deliverables and evidence are complete; record the exact failed command and required account action.
- Never promote to Production, merge the Draft PR, force-push, rewrite history, delete source/catalog/request/private media data or expand provider/product scope.
