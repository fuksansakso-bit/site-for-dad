# Test strategy PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1A and Phase 1B.1 gates passed; Phase 1B.2 isolated full-catalog verification in progress; scale, real acceptance and production tests gated |
| Версия | 0.7.0 |
| Дата | 2026-08-03 |
| Requirements | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) and profile specs |
| Acceptance | [ACCEPTANCE_CRITERIA.md](../specs/01-product/ACCEPTANCE_CRITERIA.md) |
| Traceability | [TRACEABILITY_MATRIX.md](../00-global/TRACEABILITY_MATRIX.md) |

## 1. Purpose and quality principles

Tests provide evidence for requirements and risk; they do not invent missing business data. Scenario status may be `DESIGNED`, `BLOCKED_TBD`, `READY`, `PASS`, `FAIL`, `QUARANTINED` with owner/reason/expiry. A test that only checks happy path or lacks requirement/version/input/expected result is insufficient.

- **TEST-SPEC-001 — MUST:** each critical requirement links profile spec, story, AC and at least one test scenario.
- **TEST-SPEC-002 — MUST:** test evidence pins build, data/catalog/price/content/asset/model/provider versions, environment and date.
- **TEST-SPEC-003 — MUST:** unit/domain tests cover money, compatibility, state transitions, identifiers and geometry independently of UI/provider.
- **TEST-SPEC-004 — MUST:** boundary/rounding/dimensions use table and property-based cases after approved values; unknown values test safe block.
- **TEST-SPEC-005 — MUST:** contract tests cover APIs/events/jobs/adapters/storage/auth and backward compatibility/idempotency.
- **TEST-SPEC-006 — MUST:** integration tests cover DB/search/cache/queue/storage/provider boundaries with controlled fixtures/faults.
- **TEST-SPEC-007 — MUST:** E2E covers guest/customer/staff roles and all primary/alternative/degraded paths.
- **TEST-SPEC-008 — MUST:** visual regression covers catalog/configurator/standard preview/AI output UI/responsive/admin; AI quality uses benchmark metrics, not screenshot alone.
- **TEST-SPEC-009 — MUST:** accessibility combines automated, keyboard, screen-reader, zoom/reflow, reduced-motion/high-contrast and manual task testing.
- **TEST-SPEC-010 — MUST:** security tests cover authorization/ownership, auth/session, CSRF/XSS/injection/SSRF, uploads/storage/jobs/providers/secrets/rate and supply chain.
- **TEST-SPEC-011 — MUST:** privacy tests cover notice/consent/data minimization/private delivery/log redaction/retention/delete/provider/backup restore.
- **TEST-SPEC-012 — MUST:** failure tests inject source/pricing/AI/storage/auth/WhatsApp/analytics/audit/queue/cache outages and verify safe fallback.
- **TEST-SPEC-013 — MUST:** pricing parity stores identical inputs, both results, exact absolute/percent difference and source/local versions/context.
- **TEST-SPEC-014 — MUST:** production/client/AMIGO media is prohibited in tests unless separate rights/basis; default fixtures synthetic or explicitly rights-cleared.
- **TEST-SPEC-015 — MUST:** flaky/quarantined critical tests do not count as passing gate and have owner/cause/expiry.
- **TEST-SPEC-016 — MUST:** test logs/artifacts/screenshots/traces are redacted/private/retained and never expose credentials or user media.
- **TEST-SPEC-017 — MUST:** destructive/recovery tests use isolated exact targets and verify rollback/restore/deletion without risking production.
- **TEST-SPEC-018 — MUST:** production release requires no open P0 failure and approved disposition for lower severity; no test waiver changes product truth.
- **TEST-SPEC-019 — MUST:** the local/CI S3 contract gate covers `1`, `65,536`, `131,072`, `159,099`, `262,144`, `515,180`, `1 MiB`, `5 MiB` and a size above multipart threshold; every case verifies put/head/get, byte and SHA equality, type/length/metadata, scoped signed read/write, delete and missing head.
- **TEST-SPEC-020 — MUST:** storage recovery coverage includes multipart complete/abort, immutable idempotence/content dedup/same-key concurrency, invalid MIME/oversize/checksum, timeout/retry/unavailable, concurrent files, graceful container restart, full Docker Desktop restart and named-volume persistence.
- **TEST-SPEC-021 — MUST:** the real authorized AMIGO gate image is downloaded only through the bounded allowlisted transport, must be exactly 515,180 bytes and match SHA-256 after download from storage; any corruption, unsupported signed URL/multipart operation or persistence failure blocks media import.
- **TEST-SPEC-022 — MUST:** Phase 1B.2 public-catalog browser acceptance uses disposable PostgreSQL/private object storage and synthetic nested catalog/media, pins one compatible active `CatalogVersion`/`PriceVersion`, covers hierarchy/search/filters/sort/cursors/detail/breadcrumb/share/conditional media/responsive/reduced-motion behavior in all five supported profiles, and proves zero runtime AMIGO requests and safe cleanup.

## 2. Test layers and ownership

| Layer | Scope | Typical owner/evidence |
|---|---|---|
| Static/schema | IDs, links, docs/contracts/config, secret/PII patterns | Engineering/docs/security report |
| Unit/domain | Rules, money, state, mapping, geometry, redaction | Module owner, deterministic runner |
| Property/table | Boundaries, combinations, round/replay/idempotency | Domain/QA generated seed and shrink case |
| Contract | API/event/job/provider/storage/auth schemas/semantics | Adapter/module consumer-provider fixtures |
| Integration | Real selected components in isolated env | Engineering/QA environment evidence |
| E2E | Browser/customer/admin task and fallback | Product/QA screen/state evidence |
| Visual | Components/screens/standard renderer/output UI | Design/QA approved baselines/diff |
| AI evaluation | Detection/mask/geometry/material/refinement quality | CV/Product/Privacy benchmark report |
| Accessibility | WCAG task/component/AT/manual | Accessibility owner/versioned run |
| Security/privacy | Threat/data lifecycle/adversarial | Security/Privacy findings/retests |
| Performance/reliability | Budgets/load/soak/fault/restore | Engineering/Ops measurements |
| UAT | Owner/master/manager real business process with safe data | Named approver and accepted exceptions |

## 3. Test environments and data

CI/test environments use ephemeral or isolated resources and deterministic fixtures. Staging uses production-like architecture with synthetic/rights-cleared catalog/material/media/room photos and provider sandboxes/mocks. No production credentials, AMIGO bulk media, customer contact/photos or live order submission.

Fixture manifests record source/licence/creator, allowed use, hash, versions, expected mapping and expiry. Pricing fixtures are clearly fictional test data unless approved real snapshot evidence; UI must never expose them as business truth. Security malicious fixtures are isolated and safe.

Required fixture sets:

- dynamic categories, rename/move/split/merge/remove/schema drift and price category `E/0/1–5/new string`;
- material properties/unknowns/assets/rights/mapping/revoke;
- compatible/incompatible/missing/conflicting rules and dimension boundaries once approved;
- quote versions/overrides/history/rounding/parity once approved;
- standard scenes/family profiles/material textures;
- synthetic/rights-cleared photos: no/multiple windows, sashes, glare/dark/occlusion/perspective/complex shapes;
- role/account/guest/project/order state matrix;
- provider/network/storage/queue/cache/audit faults and restore snapshots.

## 4. Critical test scenarios

Each row is a full test design seed; profile suites expand permutations without changing ID meaning.

| Test ID / level | Preconditions and input | Expected result | Links / status |
|---|---|---|---|
| **TS-PARTNER-001** / integration+content | Active partner scope; approved and revoked/missing badge/asset variants | Correct statement/asset only under scope; revoke removes all placements with text fallback/audit | `AC-PARTNER-001`, `PARTNER-*`; `DESIGNED` |
| **TS-AMIGO-PARITY-001** / contract+E2E | Captured category/system locally ready vs source-only; AMIGO adapter off | Ready path own UI; source-only inquiry/deferred; local active works offline | `AC-AMIGO-PARITY-001`; `DESIGNED` |
| **TS-CATALOG-001** / unit+E2E | Verified variants/properties plus unknown; combined search/facets | Exact compatible matches/counts; unknown not positive; stable IDs and approved media | `AC-CATALOG-001`; `DESIGNED` |
| **TS-CATALOG-DYNAMIC-001** / integration | New unseen category/property/price string plus source removal beside local-only data/overlay in staged fixture | Normalize/stage/map without code change; no auto readiness/delete; public read stays pinned to active `CatalogVersion`; schema/authority conflict blocks | `AC-CATALOG-DYNAMIC-001`; `DESIGNED` |
| **TS-ASSET-MAP-001** / integration+security | Authorized original, duplicate, wrong variant and conflicting hash/source | Complete provenance/graph/mapping; duplicate/conflict quarantine; no public delivery | `AC-ASSET-MAP-001`; `DESIGNED` |
| **TS-PORTFOLIO-001** / content+E2E | Owner-created local project vs AMIGO example and missing rights/PII | Local/partner labels never mix; missing review blocks; alt/attribution correct | `AC-PORTFOLIO-001`; `DESIGNED` |
| **TS-BADGE-001** / visual+content | Approved badge/text fallback/revoke at all responsive surfaces | Correct proportions/label/placement; fallback truthful; cache invalidates | `AC-BADGE-001`; `DESIGNED` |
| **TS-ASSET-REVOKE-001** / integration+recovery | Published original with derivatives/placements/cache/preview | Access blocked first; graph invalidated/deleted per policy; retry idempotent | `AC-ASSET-REVOKE-001`; `DESIGNED` |
| **TS-CONFIG-001** / unit+property+E2E | Each step, valid/deny/require/limit/warn/missing/conflict/dimension boundary | Only verified valid revision quotes; dependencies invalidate; reason/recovery accessible | `AC-CONFIG-001`; `BLOCKED_TBD` limits |
| **TS-PRICE-001** / unit+property+contract | Valid config with compatible active `CatalogVersion`/`PriceVersion`, scoped override, missing rule/version/category/conflict and attempted AMIGO/staging input | Exact reproducible amount/version/source+override breakdown from PostgreSQL active versions or typed unavailable; direct source/staging read denied; never zero/guess | `AC-PRICE-001`; `BLOCKED_TBD` formula/data |
| **TS-CART-001** / unit+E2E | Multi-item valid/stale/unavailable; edit/duplicate/remove/retry | Target-only revision, honest totals/statuses, no unintended duplicate | `AC-CART-001`; `DESIGNED` |
| **TS-QUOTE-HISTORY-001** / integration | Saved quote; activate/rollback/new source version; reopen/recalculate | Original immutable/replayable; new linked revision; retired source retained | `AC-QUOTE-HISTORY-001`; `BLOCKED_TBD` price fixture |
| **TS-PRICE-ACTIVATE-001** / integration+security | `OWNER`/`ADMIN` versus denied roles; exact diff review/confirmation; validation/parity/conflict/failure/concurrency | Only allowed role confirms; every attempt audited; atomic one active version, old quotes pinned, rollback; failed candidate no cutover | `AC-PRICE-ACTIVATE-001`; source/formula fixture `BLOCKED_TBD` |
| **TS-QUOTE-CONFIRM-001** / domain+E2E | Manager verified inputs/allowed and disallowed adjustment | New confirmed revision with reason/explanation; disallowed remains draft | `AC-QUOTE-CONFIRM-001`; `BLOCKED_TBD` workflow |
| **TS-STANDARD-PREVIEW-001** / visual+unit | Supported families/materials/controls plus missing/wrong/revoked asset | Deterministic exact mapping/protected layers/text; unsupported honest fallback | `AC-STANDARD-PREVIEW-001`; `DESIGNED` profiles pending |
| **TS-AI-UPLOAD-001** / security+integration | Valid, spoofed, polyglot, bomb, malware, EXIF, too large/low quality | Only safe normalized private input; rejection/cleanup; no URL/content log | `AC-AI-UPLOAD-001`; `BLOCKED_TBD` limits |
| **TS-GEOMETRY-001** / AI benchmark+E2E | Synthetic rights-cleared no/multi-window, sashes, perspective, occlusion, exact material | User-confirmed geometry and base meet approved metrics; low quality correct/fail | `AC-GEOMETRY-001`; `BLOCKED_TBD` benchmark |
| **TS-AI-VIS-001** / E2E+privacy | Guest upload→select/edit→base→attach, with detector/worker outage | Private usable base/manual fallback; opaque attach; standard path remains | `AC-AI-VIS-001`; `BLOCKED_TBD` |
| **TS-AI-REFINE-001** / AI contract+benchmark | Base pass; provider success/throttle/outage/drift/unsafe/late response | Only invariant-passing labelled revision accepted; otherwise unchanged base | `AC-AI-REFINE-001`; `BLOCKED_TBD` provider/metrics |
| **TS-VIS-DELETE-001** / privacy+recovery | Delete at upload/detect/base/refine/share and late callback/backup | Immediate revoke; graph/jobs/provider cleanup; no resurrection/stale URL | `AC-VIS-DELETE-001`; `BLOCKED_TBD` retention/provider |
| **TS-WHATSAPP-001** / E2E+privacy | Cart valid/mixed; consultation/measure; deep link present/absent | Editable minimal summary/opaque ref; no private/internal data; fallback contact | `AC-WHATSAPP-001`; `DESIGNED`, channel mode TBD |
| **TS-MANAGER-CONTEXT-001** / security | Assigned/unassigned/expired/guessed handoff ref | Only authorized safe metadata; neutral denial/no existence leak; audit | `AC-MANAGER-CONTEXT-001`; `DESIGNED` |
| **TS-INSTALLMENT-001** / content+E2E | All public/SEO/schema/message surfaces; quote present/stale/missing | Exact neutral phrase; no prohibited claims/sensitive fields/state approval | `AC-INSTALLMENT-001`; `DESIGNED` |
| **TS-ORDER-001** / domain+concurrency | Every proposed allowed/denied transition, stale version, duplicate command | One valid audited transition; denied/duplicate no partial/order-from-handoff | `AC-ORDER-001`; `BLOCKED_TBD-BIZ-004` |
| **TS-MEASURE-001** / E2E | Confirmed region/service and unapproved/no slot process | Schedule only confirmed evidence; otherwise requested/manual; free claim correct | `AC-MEASURE-001`; `BLOCKED_TBD-INSTALL-003` |
| **TS-ORDER-STATUS-001** / security+E2E | Owner vs other customer; internal/public states/notes | Customer sees mapped safe state only; cross-owner neutral denial | `AC-ORDER-STATUS-001`; `BLOCKED_TBD` mapping |
| **TS-WARRANTY-001** / domain+legal | Order found/not found, covered/excluded unproven, minimal evidence | Claim accepted/manual verification; no auto rejection; statutory safeguard | `AC-WARRANTY-001`; `BLOCKED_TBD-WARRANTY-001` |
| **TS-AUTH-001** / security+E2E | Valid/invalid/unknown/expired/replayed login/recovery/session/role revoke | Scoped session, neutral/rate errors, no enumeration/object bypass | `AC-AUTH-001`; `BLOCKED_TBD-ACCOUNT-*` |
| **TS-PROJECT-SAVE-001** / concurrency+security | Valid/expired/leaked/already claimed token; same/different account retries | One secure idempotent claim, history intact, no other-owner disclosure | `AC-PROJECT-SAVE-001`; `BLOCKED_TBD` TTL/auth |
| **TS-ADMIN-001** / E2E+security | Full role/object/env/version matrix, valid/stale typed mutation | Only capability succeeds atomically/audited; conflict no partial | `AC-ADMIN-001`; `DESIGNED` |
| **TS-SEC-001** / adversarial | ID guessing, header/role tamper, CSRF/XSS/injection/SSRF/upload/storage/job/secrets | All unauthorized/malicious paths blocked/neutral/audited; safe fallback | `AC-SEC-001`; `DESIGNED`, implementation later |
| **TS-ROLLBACK-001** / integration+recovery | Catalog/price/media release then simulated health/purge failure and repeat rollback | Known prior pointers/cache/delivery restored or blocked; history/evidence retained | `AC-ROLLBACK-001`; `DESIGNED` |
| **TS-OWNER-DASHBOARD-001** / integration+UX | Known zero vs missing/stale/blocked/pending telemetry | Dashboard differentiates states/completeness and links owner/evidence/action | `AC-OWNER-DASHBOARD-001`; `DESIGNED` |
| **TS-BUSINESS-RULE-001** / documentation+gate | Complete vs ambiguous owner answer for open TBD | Canonical spec/changelog/status/gate updates only on clear answer; ambiguous stays open | `AC-BUSINESS-RULE-001`; `DESIGNED` |
| **TS-AMIGO-SYNC-001** / adapter+integration | Authorized fixture capture; auth/source/format/truncation failure; attempted public read from AMIGO/raw/staging | Immutable staged capture/run with authority metadata; active PostgreSQL version untouched; direct runtime read denied; failure/freshness audit complete | `AC-AMIGO-SYNC-001`; `BLOCKED_TBD` transport |
| **TS-SYNC-DIFF-001** / unit+property | Add/change/rename/move/remove/split/merge/conflict/new schema/category with local-only records and Business Owner overlays | Complete field/relation severity/impact; removal creates proposal and never auto-deletes/hides local data; ambiguous authority/override blocks activation | `AC-SYNC-DIFF-001`; `DESIGNED` fixtures |
| **TS-SYNC-ROLLBACK-001** / integration+fault | Exact-diff Business Owner approval + administrator activation, projection failure, repeat/out-of-order command and rollback | Atomic active `CatalogVersion` pointer, version-pinned cache/search/filter/analytics rebuild, complete audit/source timestamps, previous version restored idempotently | `AC-SYNC-ROLLBACK-001`; `DESIGNED` |
| **TS-PERF-001** / lab+regional+load | Four approved cities, mobile + home/office Wi-Fi, ≥2 routes, mobile/desktop Chrome; cold/warm/save-data/reduced + load/fault | Critical funnel meets approved budgets or documented usable degradation | `AC-PERF-001`; regional matrix resolved, budgets `BLOCKED_TBD-INFRA-003/005` |
| **TS-PRIV-001** / privacy+security | Notice/consent/upload/access/log/analytics/delete/provider/backup across owner/attacker | Purpose/minimum/private/no-training/retention/delete with no unauthorized content | `AC-PRIV-001`; `BLOCKED_TBD-PRIV-*` |
| **TS-ACCESS-001** / automated+manual AT | Keyboard, screen reader, 200/400%, 320/375, touch, forced colors, reduced motion full journey | Equivalent operable/perceivable task, focus/errors/live states and no motion/timing trap | `AC-ACCESS-001`; `DESIGNED`, AT matrix TBD |

## 5. Pricing parity test protocol

Parity suite follows `PRICING-TEST-001`–`005` and stores case ID, identical source version/system/material/dimensions/hardware/options/quantity, source result, local version/result, exact absolute difference, percentage difference when valid, component diff, expected tolerance/status, evidence and reviewer. Cases cover each active family/system/model/material category/options, boundaries, quantities, overrides, services, rounding, per-item minimum, activation/rollback and missing/conflict/outage.

Absolute difference up to 1 ruble inclusive passes parity only when all approved inputs are identical; a larger difference is a parity error. Lack of authorized source result means test is `BLOCKED_TBD`, not pass. Tests do not automate around access controls/CAPTCHA or treat volatile UI text as stable oracle.

## 6. AI evaluation and visual test boundary

AI benchmark is defined in `AI_EVALUATION_SPEC`; production images prohibited. Geometry/material/protected-region metrics and human rubric determine readiness by product family. Standard preview uses deterministic visual baselines plus semantic output. Generative output cannot be approved by subjective realism alone; identity/invariant failures are blocking.

## 7. Accessibility protocol

Automated scan is baseline only. Manual critical journey tests keyboard/focus, representative screen readers/browsers/mobile pair, zoom/reflow/text spacing, forced colors/contrast, touch/drag alternatives, reduced motion and cognitive clarity. Version/date/AT/browser/device/tasks/defects recorded. Critical issue blocks release even if score high.

## 8. Security/privacy protocol

Threat-driven tests run in authorized isolated scope. No production destructive/scanning/provider action without separate approval. Findings include severity, asset/requirement, reproduction minimized, evidence protected, remediation and regression. Secret/PII telemetry scanning runs on happy/error/exception/provider/upload paths. Deletion verifies immediate access revoke, all primary/derived/provider/cache paths and backup restore behavior.

## 9. Performance/reliability/recovery protocol

Use representative regional/device/network matrix and approved task budgets. Load models steady/spike/soak/retry storm/source sync/AI/provider outage/backup. Fault injection covers dependencies and verifies no fake price/order/private exposure. Backup restore in isolation verifies checksums/counts/schema and deletion/revocation before exposure. RPO/RTO remain TBD until owner decision.

## 10. Entry/exit and defect policy

Test execution entry: approved behavior/data/fixtures/environment/versions, no unresolved contradiction and relevant TBD either closed or expected safe fallback specified. Exit: required scenarios executed; no open P0; failures dispositioned; coverage/traceability complete; artifacts redacted; regression/performance/security/privacy/a11y/recovery gates; owner UAT for business facts.

Defect records requirement/test/build/data versions, environment, expected/actual, steps, severity/risk, safe evidence and owner. Flaky is a defect. Waiver has approver/risk/expiry/monitoring and never approves wrong money/private leak/rights breach/data loss.

## 11. CI and scheduling concept

Per change: static/unit/property/contract/fast a11y/security schema. Per integration: component/integration/E2E/visual. Nightly/regular: broader E2E, AI fixture, dependency/fault. Pre-release: full supported matrix, regional/performance/security/privacy/a11y, migration/backup/restore/UAT. Post-deploy: non-destructive smoke/synthetic with synthetic data and rollback signals. Exact tooling waits for implementation ADR.

## 12. Metrics and reporting

Report requirement/AC/test coverage, pass/fail/blocked/quarantined, P0/P1 defects, flake, runtime, regression, budget, parity/AI distributions, a11y/manual evidence, security/privacy/deletion/restore and data freshness. Coverage percentage never hides untested critical risk or `BLOCKED_TBD`.

## 13. Phase 1A execution evidence

The provider-neutral `ci:verify` pipeline passed 9/9 stages in the working tree and a clean clone. Executed Foundation baseline remains historical: 61 unit/contract tests, 19 PostgreSQL/RustFS/Graphile/identity integration/recovery tests and 20 browser scenarios. RustFS evidence no longer authorizes active use after the Phase 1B.1 Windows failure; PostgreSQL/Graphile/identity evidence remains unchanged. `OWNER-DECISION-010` separately moves only Phase 1B.1 catalog tests from designed to required execution. Full Phase 1A detail: [report](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

### 13.1. Phase 1B.1 storage gate evidence

On Windows 11 with Docker Desktop 4.84.0 / Engine 29.6.2, digest-pinned VersityGW `v1.4.1` passed 15/15 automated contract cases (86.45 s, full harness exit 0). The size matrix passed byte-for-byte; real AMIGO JPEG SHA-256 was `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`. Signed read/write, path-style SigV4, multipart completion/abort, negative anonymous access, timeout/retry/unavailable mapping, concurrency/idempotence/dedup, graceful restart, Docker Desktop auto-recovery and named-volume persistence passed. This storage gate permitted continuation of the media WIP; the separate real import/publication result is recorded below.

### 13.2. Phase 1B.1 real publication and recovery evidence

Real manual run `9bd1a4f8-e456-4617-9e16-7f5604c1c65c` used a new correlation ID, processed 275/275 items with zero failures, produced exact 32-variant/40-entry catalog composition and 32-record price version, then passed separate OWNER approval and ADMIN activation as CatalogVersion/PriceVersion v1. The public API returned 32 items from those exact active IDs, rejected unknown filters/stale media references and delivered 32/32 primary images with response-body SHA equal to ETag. Provider-neutral storage re-read all 59 allowlisted assets (8,340,101 bytes) byte-for-byte; the 515,180-byte AMIGO JPEG matched `ac86fc…d0cd` through both StoragePort and signed read. Graceful full-environment restart preserved the active versions, database history and all objects. No-op manual repeat `aee135bd-855a-4fb6-a8e1-2fe60e61728a` completed 275/275 with zero failures, created no catalog/price version and left entity/price/media/link counts and active pointers unchanged. Historical run `798d5513-27b1-48e3-ab8e-389eeb672db4` remains `FAILED / CATALOG_PIPELINE_STORAGE_UNAVAILABLE`; recovery lineage remains recorded through `f9407db3-9e82-4174-9e21-87528bdd7092`. Machine evidence is regenerated locally by `pnpm test:catalog-pilot` without logging credentials or object keys.

The final Windows CI-equivalent run passed 9/9 stages with Node `24.18.1`, pnpm `11.18.0`, PostgreSQL `18.4`, Docker Engine `29.6.2`, Playwright `1.62.1` and digest-pinned VersityGW `v1.4.1`. It included frozen installation, documentation/scope/boundary validation, lint, strict typecheck, coverage, fresh/upgrade/recovery database paths, the 15-case storage gate, production build, generated-canary artifact scan, 25/25 browser scenarios across Chromium/Firefox/WebKit/narrow/reduced-motion, committed-secret scan and a critical dependency advisory scan.

### 13.3. Phase 1B.2 isolated active-catalog gate

`pnpm test:catalog-browser` creates exact disposable PostgreSQL and digest-pinned private VersityGW resources, applies reviewed migrations, seeds only synthetic nested categories/materials and generated PNG bytes, activates a compatible catalog/price pair and starts the production build. Its browser suite covers hierarchy and counts, version/query-bound cursor pagination, descendant filtering, search and allowlisted sort, detail/breadcrumb/price/version context, local image bytes, copy-link success/fallback, ETag/304, narrow reflow and reduced motion across Chromium, Firefox, WebKit, narrow and reduced-motion profiles. The harness fails on runtime AMIGO access, credential leakage, startup failure or unsafe resource targeting; failed evidence is stopped and preserved, while successful disposable resources are removed.

The 2026-08-03 Windows execution passed all 5/5 active-catalog browser profiles against four synthetic published materials, three nested categories, four private local media objects and compatible CatalogVersion/PriceVersion v7001; the harness reported zero runtime AMIGO requests and removed the successful disposable environment. The enclosing CI-equivalent gate passed 9/9 stages, including 25/25 fail-closed baseline browser scenarios plus the separate 5/5 active-catalog run, clean ten-migration/recovery paths, 15/15 storage cases, production build/artifact scans and repository secret/advisory checks. Catalog unit coverage passed 38/38 cases, catalog contracts 6/6 and web public API/read behavior 20/20; integration rollback additionally re-read and proved the restored public catalog/version pair.

## 14. Dependencies, risks and open questions

Dependencies: all specs/ADRs/evaluations, implementation stack/environments, approved fixtures/business data/support matrix. Open: numeric budgets/thresholds, real price/source fixtures, browser/AT matrix, provider sandboxes, test tooling/owners, UAT roles, security test scope and retention of artifacts. Risks: fake fixtures mistaken production truth, flaky E2E, unlicensed media, provider dependence, automated a11y/AI false confidence and unsafe production testing.

## 15. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined risk-based multi-layer strategy and 40 critical scenarios mapped one-to-one to current acceptance criteria. |
| 0.2.0 | 2026-08-02 | Updated parity tolerance/input contract and regional production matrix from `OWNER-DECISION-006/007`; Foundation execution evidence will be added at Phase 1A completion. |
| 0.3.0 | 2026-08-02 | Added executed Phase 1A counts and clean-clone CI evidence without claiming any gated business/production scenario passed. |
| 0.4.0 | 2026-08-02 | Marked Phase 1B.1 pilot tests required/in progress after explicit owner authorization. |
| 0.5.0 | 2026-08-03 | Added and recorded the passed VersityGW real-image/signed/multipart/failure/restart contract gate from `OWNER-DECISION-011`. |
| 0.6.0 | 2026-08-03 | Recorded real 32-variant publication, 59-object byte/SHA verification, public delivery, graceful restart, historical failed-run preservation and no-op repeat evidence. |
| 0.7.0 | 2026-08-03 | Added the isolated Phase 1B.2 active-catalog browser gate and its synthetic data, private storage, no-runtime-AMIGO, conditional delivery, responsive and recovery contract. |
