# Phase 2C — final premium design, typography, motion and ergonomics plan

## Status and verifiable outcome

- **Status:** IN PROGRESS — business administration
- **Branch:** `phase/2c-final-premium-design`
- **Baseline:** `bdaa053eee6491a9286355707008a39cbac1abff` (`second-github/main`)
- **Safety tag:** `pre-final-design-phase`
- **Authorized by:** `OWNER-DECISION-024`
- **Target repository:** `https://github.com/fuksansakso-bit/site-for-dad.git`
- **Target outcome:** the existing Phase 2B Next.js/Supabase/Polza product receives a complete, original, light-first `PREMIUM INTERIOR TECH` presentation and interaction layer across every required public and staff route, without changing price authority, catalog provenance, private-media ownership, provider topology or production state.

## Dependencies and fixed decisions

- Phase 2A and the complete Phase 2B implementation are present in target `main`; file content at the protected baseline matches Phase 2B commit `cd62a17be619272a30921ae288e4f15b2de144de`.
- Baseline lint, strict typecheck, 49 tests and production build pass before UI edits. The available bundled runtime is Node 24.14.0 rather than the pinned 24.18.1, so the passing result carries an explicit toolchain-drift warning and the final gate MUST re-run in the best available exact environment.
- Phase 2B remains `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING` until a bounded provider flow is verified; missing or rejected Polza credentials select the honest disabled/pending state and do not block the visual phase.
- The configured Supabase project now passes migrated-schema/public REST/Storage checks and contains the idempotently imported retained catalog: 19 categories, 1,428 materials, one settings row and 1,371 verified catalog objects. Direct PostgreSQL backup remains blocked by an invalid password in `SUPABASE_DB_URL`; this does not affect the application/API path and MUST be corrected from the Supabase Connect dialog before backup evidence is claimed.
- The light-first palette, Manrope + Cormorant Garamond typography, short first-visit starfield, route inventory, viewport matrix, accessibility target, visual baselines, commit sequence and Preview-only delivery are direct Product Owner decisions.
- Final business brand and logo remain open under `TBD-DESIGN-001`; `PROJECT_NAME` stays an internal codename and MUST NOT appear as the public brand. Preview uses a neutral settings-backed label and the admin warns that the brand must be set before production.
- Existing approved AMIGO catalog media MAY be presented under its registered rights. Portfolio sections MUST render only separately approved real business work and MUST NOT relabel supplier media as the father's portfolio.
- Production promotion, merge, payments, customer accounts, new catalog discovery/import, provider replacement, direct Google API, SAM/masks/segmentation, Python/GPU/worker services and destructive data changes remain outside scope.

## Work plan

1. **COMPLETED — Authorization and preflight:** recorded `OWNER-DECISION-024`, baseline/tag/branch, active plan, QG-601–670, visible blockers and exact Preview/repository boundary; docs validation and baseline lint/typecheck/49 tests/build pass.
2. **COMPLETED — Design foundation:** implemented central color/type/space/radius/shadow/motion tokens, local `next/font`, semantic primitives, presentation mappings and responsive public/admin foundations; lint/typecheck/build and desktop/mobile visual checks pass.
3. **COMPLETED — Intro and landing:** added the bounded first-visit starfield with skip/reduced-motion/weak-device fallbacks, source-backed premium landing, exact approved hero copy, conditional AI/WhatsApp, real published catalog/portfolio content and honest empty states; lint, typecheck, build and 1440/mobile visual review pass.
4. **COMPLETED — Catalog experience:** redesigned listing, deferred search, filters, stable sorting, incremental rendering, responsive cards, breadcrumbs and material detail while preserving published Supabase price/availability authority, conditional AI entry and honest unavailable/manual states; the migrated live project passes 19/1,428 API counts and desktop browser rendering with real Storage images, zero broken images and zero console errors.
5. **COMPLETED — Conversion flow:** redesigned calculator, reactive local cart, checkout, request result and WhatsApp handoff without changing server price or immutable request contracts; live manual-price calculation → add-to-cart → repriced cart → checkout passes without horizontal overflow or console errors, and no synthetic request/PII was submitted.
6. **COMPLETED — AI experience:** rebuilt the five-step visualizer as one premium studio with a connected animated light-flow progress track, source-backed material/photo/consent/generation/result states, dynamic retention notice, pointer/keyboard before-after control, safe disabled/error/deleted recovery and no public codename. A single rights-cleared live attempt passed private upload, ownership and deletion but Polza returned normalized `POLZA_PROVIDER_ERROR` before provider-job creation, so live quality remains pending and no success is claimed.
7. **IN PROGRESS — Business administration:** unify Russian login, dashboard, materials, orders, portfolio, settings, staff and AI administration with role-safe actions.
8. **PENDING — Responsive and states:** complete desktop/tablet/mobile navigation, 320–1920 px ergonomics, loading/empty/error/success/disabled/offline states and internal-label mappings.
9. **PENDING — Accessibility and performance:** verify keyboard, focus, semantics, contrast, zoom, reduced motion, images/fonts, client boundaries and measured build/runtime budgets.
10. **PENDING — Verification:** add unit/component/browser/route/visual/accessibility coverage and execute scenarios A–G plus the required viewport/baseline matrix.
11. **PENDING — Documentation:** complete final design/typography/motion/component specs, route audit, release QA, traceability, roadmap, changelog and completion report.
12. **PENDING — Preview and delivery:** create and directly verify a Vercel Preview in the target account, push all logical commits to `second-github`, open the unmerged Draft PR and stop.

Only one item may be `IN PROGRESS`; this file MUST be updated as evidence is produced.

## Planned commits

1. `docs: authorize final premium design phase`
2. `feat: establish final design tokens and typography`
3. `feat: add starfield intro and premium landing`
4. `feat: redesign catalog and material pages`
5. `feat: redesign calculator cart and checkout`
6. `feat: polish AI visualization experience`
7. `feat: unify Russian business administration`
8. `feat: complete responsive navigation and mobile ergonomics`
9. `fix: complete accessibility and interaction states`
10. `perf: optimize final visual experience`
11. `test: add final visual accessibility and route coverage`
12. `docs: complete final design and release polish`

## Verification matrix

- Routes: `/`, `/catalog`, `/catalog/[slug]`, `/calculator`, `/cart`, `/checkout`, `/request/[publicReference]`, `/visualizer`, `/visualizer/[publicReference]`, `/admin/login`, `/admin`, `/admin/materials`, `/admin/orders`, `/admin/portfolio`, `/admin/settings`, `/admin/staff`, `/admin/ai-visualizations`.
- Viewports: `320x568`, `360x800`, `375x812`, `390x844`, `430x932`, `768x1024`, `1024x768`, `1280x800`, `1440x900`, `1920x1080`.
- Browser scenarios: public catalog-to-request path; manual-price path; AI full flow or honest disabled state; staff material availability/price; portfolio governance; mobile `360x800`; keyboard/reduced-motion/offline/error recovery.
- Visual baselines: landing desktop/mobile; catalog desktop/mobile; material desktop/mobile; calculator mobile; cart mobile; visualizer upload/result; admin dashboard/materials; login.
- Quality commands: documentation validation, formatting, lint, strict typecheck, unit/component tests, browser/visual/accessibility suite, production build, secret/artifact/scope scans and Preview smoke.

## Stop conditions and unresolved decisions

- Stop dependent work if code and canonical behavior conflict, if a route would require invented business data, or if rights/provenance cannot distinguish supplier catalog media from owner portfolio work.
- Missing remote Supabase or Polza credentials do not block design; do not claim remote/live evidence and render the safe configured state.
- Missing final brand/logo does not block Preview; public UI uses the neutral settings-backed fallback and production remains blocked by `TBD-DESIGN-001`.
- Missing Vercel or GitHub authentication blocks only Preview/publication after all local deliverables and evidence are complete; record the exact failed command and required account action.
- Never promote to Production, merge the Draft PR, force-push, rewrite history, delete source/catalog/request/private media data or expand provider/product scope.
