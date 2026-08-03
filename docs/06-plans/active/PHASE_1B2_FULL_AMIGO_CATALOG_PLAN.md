# PHASE 1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION

## 0. Control block

| Поле | Значение |
|---|---|
| Plan ID | `PLAN-1B2-001` |
| Статус | **IN PROGRESS — AUTHORIZED_PHASE_1B2_FULL_AMIGO_CATALOG** |
| Ветка | `phase/1b2-amigo-full-catalog` |
| Исходный commit | `af8411d2b854e572b6b61b214d3e99a88b96cafc` |
| Зависимость | `PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT` |
| Разрешение | `OWNER-DECISION-012` в [GLOBAL_SPEC](../../specs/GLOBAL_SPEC.md#22-решения-владельца-для-implementation-governance-и-будущих-feature-gates) |
| Проверяемый результат | Существующий Phase 1B.1 importer контролируемо обнаруживает и импортирует полный доступный разрешённый AMIGO catalog в PostgreSQL/VersityGW, формирует manifest и diff, сохраняет local overlays, проходит ручную activation и обслуживает масштабируемые `/catalog` и `/admin/catalog` без runtime-запросов к AMIGO. |
| Следующая фаза | **Phase 1C не разрешена и не начинается** |

## 1. Scope boundary

Phase 1B.2 расширяет только существующий catalog/source/normalized/business-overlay pipeline. Разрешены dynamic full discovery, pagination/nesting, source snapshots, products/systems/models/materials/variants/properties/compatibility facts, media, source card/base prices, full manifest, resumable Graphile Worker jobs, diff/review/activation, local visibility/availability/price overlays, bulk controls и full-catalog public/admin surfaces.

Phase 1B.2 не реализует dimensional calculator, formula engine, minimum-price rule, configurator, preview/AI, cart/order/WhatsApp/installment/account, final landing/starfield, production deployment, production secrets или production storage provider. Source price/price-from остаётся catalog fact; неизвестная цена — `PRICE_ON_REQUEST`, никогда `0`.

## 2. Canonical ownership and runtime rules

1. AMIGO remains upstream authority for source assortment, categories, systems, models, materials, variants, technical data, supplier image identity and base prices.
2. Business Owner remains authority for local availability, visibility, local descriptions/order, local price overrides, portfolio and commercial conditions.
3. PostgreSQL is the only public catalog runtime source. Public requests never call AMIGO, raw snapshots or staged candidates.
4. Public composition resolves `Business Overlay > Active Local CatalogVersion > normalized AMIGO source data` without overwriting any layer.
5. VersityGW remains the verified local/CI `StoragePort` adapter. No production provider decision is made.
6. Initial full candidate proposes `visibility = VISIBLE` and `availability = INQUIRY_ONLY`; these defaults become public only after review and explicit activation. Later sync never resets an existing local decision.
7. `HIDDEN` is a visibility command, not a source or availability fact. Client labels are `Есть в наличии`, `Нет в наличии` and `Уточнить наличие` according to the active local overlay.

## 3. Entry evidence

- [x] Phase 1B.1 passed with real 32-variant/59-media/restart/no-op/CI evidence.
- [x] Product Owner explicitly authorized only Phase 1B.2 in the requested branch.
- [x] Baseline commit and clean branch were confirmed before changes.
- [x] Mandatory repository documents, `OWNER-DECISION-008/009/011` and all accepted ADR were reviewed.
- [x] Existing `AmigoCatalogSourceAdapter`, PostgreSQL/Prisma schema, Graphile Worker pipeline and VersityGW storage are the foundation; a parallel importer is prohibited.
- [x] Partner permission covers the requested catalog, technical, media and base-price facts; code/design/DOM reuse, hotlink, watermark removal, training use and access bypass remain prohibited.
- [x] Full transport discovery may proceed only on public HTTPS paths reachable without login/CAPTCHA and under concurrency/rate/redirect/SSRF controls.
- [x] Exact calculator formulas, production infrastructure and Phase 1C remain outside scope.

## 4. Transport and discovery guardrails

- Discovery starts from registered public AMIGO catalog/navigation pages and follows only normalized, same-host, HTTPS catalog/category/entity/media links admitted by a typed path policy.
- Login, account, cart, action, filter, search, Bitrix mutation, CAPTCHA and customizer network endpoints are denied.
- Concurrency defaults to `1`; rate limiting, exponential backoff with jitter, bounded retries, timeout and redirect limits are mandatory and configuration-bounded.
- Category/product/material identity uses published stable source IDs. Slug/title alone cannot be the key.
- Parser and mapping versions, source hash and structured item diagnostics are recorded for every capture.
- Parser drift quarantines only affected entities as `PARSER_REVIEW_REQUIRED`; safe siblings continue.
- A missing credential, CAPTCHA, technical prohibition, unstable identity, duplicate creation or mass parser failure is a stop condition, not a reason to weaken controls.

## 5. Full Catalog Import Manifest

Each run stores an immutable manifest with run/source/parser/mapping versions, start/end, discovery counts for categories/products/systems/materials/variants, media links/imports, price records, warnings/failures/skips/duplicates/source removals and checksum summary. The manifest is resumable by durable stage checkpoints and is available to authorized staff in human-readable form; raw payload, secrets, cookies and internal diagnostics are not sent to public clients.

Raw snapshots are minimized and reproducible. Scripts/session tokens/cookies/personal data are excluded. A snapshot referenced by an active `CatalogVersion` or audit is never deleted. Until `TBD-ASSET-RETENTION-001` is resolved, automatic deletion of unreferenced snapshots remains disabled; the retention job supports explicit reviewed policy without inventing a duration.

## 6. Execution plan

Only one stage may be `IN_PROGRESS`.

| № | Этап | Статус | Проверяемое завершение |
|---:|---|---|---|
| 1 | Authorize Phase 1B.2, create active plan and entry gate | COMPLETED | `OWNER-DECISION-012`, scope, branch, stop conditions, QG and changelog committed as `377a74e` |
| 2 | Expand existing AMIGO source discovery | COMPLETED | Existing adapter completed 114 real pages: 28 categories, 56 systems, 9 models, 1655 variants, semantic source hash, 0 failures; regression suite passed in `177c83c` |
| 3 | Add resumable full catalog import | COMPLETED | Append-only snapshots, 8 durable checkpoints, verified-key skip/resume, hierarchy/model normalization, cancellation, daily self-schedule and COMPLETE/PARTIAL_FAILED manifests passed clean migration/recovery, 12 integration scenarios and 9/9 CI stages |
| 4 | Import full catalog media | COMPLETED | Exact material/category/system/model mappings, verified private SHA dedup, bounded continuation/cancellation, retry isolation, restart revalidation and missing-object fail-closed behavior passed 13 job scenarios, 15 storage cases and the 9/9 CI gate |
| 5 | Add full catalog price snapshots | COMPLETED | Run-version-pinned material/model price revisions, exact typed targets, price-from/category/currency/context, `PRICE_ON_REQUEST`, price-only diffs and persistent local overrides passed clean 8-migration recovery, integration coverage and all 9 CI stages |
| 6 | Add full catalog review and activation | COMPLETED | Append-only exact-checksum selected/all review, approve/defer/reject, approval completeness, overlay-preserving publication preparation and source-bound atomic activation/rollback passed clean 9-migration recovery, 14 catalog scenarios and all 9 CI stages |
| 7 | Add bulk business catalog controls | COMPLETED | Exact category-subtree/filter/selected preview and OWNER apply are atomic, stale/partial/unauthorized/frozen-candidate safe and append-only/idempotent; source, price override and unrelated owner fields remain unchanged across clean 10-migration recovery and all 9 CI stages |
| 8 | Expand `/admin/catalog` | COMPLETED | Full inventory hierarchy, bounded server filters/pages, safe manifest/run/diff/history, exact review/bulk/release actions and responsive keyboard states passed clean 10-migration integration and all 9 CI stages |
| 9 | Expand `/catalog` | COMPLETED | Hierarchy, search, server filters/sort/cursors, detail/media/breadcrumb/share URL/loading/error/empty states passed without AMIGO; full CI 9/9 |
| 10 | Verify full catalog expansion | COMPLETED | 38 catalog, 6 contract and 20 web cases plus rollback public-state recovery passed; isolated active PostgreSQL/private-media catalog passed 5/5 browser profiles with zero runtime AMIGO; enclosing CI gate passed 9/9 with the 25/25 fail-closed baseline |
| 11 | Validate full catalog scale | IN_PROGRESS | Synthetic dataset larger than real catalog verifies bounded memory, queries, no N+1, bulk and pagination performance |
| 12 | Real import, acceptance documentation and stop | PENDING | Real manifest/no-op/resume/daily/bulk/persistence/public/perf/CI evidence recorded; report complete; tree clean; Phase 1C absent |

## 7. Commit sequence

1. `docs: authorize Phase 1B.2`
2. `feat: expand AMIGO source discovery`
3. `feat: add resumable full catalog import`
4. `feat: import full catalog media`
5. `feat: add full catalog price snapshots`
6. `feat: add full catalog review and activation`
7. `feat: add bulk business catalog controls`
8. `feat: expand admin catalog`
9. `feat: expand public catalog`
10. `test: verify full catalog expansion`
11. `perf: validate full catalog scale`
12. `docs: complete Phase 1B.2`

## 8. Verification matrix

| Layer | Required evidence |
|---|---|
| Unit | discovery, nested mapping, source identity, normalization, overlay precedence/defaults, `PRICE_ON_REQUEST`, dedup, diff classes, parser failures |
| Contract | full source adapter, media transport, public/admin API, durable jobs, activation and safe errors |
| Integration | real-shaped full import, no-op, resume, new category, price change, source removal, overlay persistence, bulk, activation/rollback/audit |
| Browser | catalog hierarchy/search/filter/cursor/detail/price/availability and admin bulk/visibility/availability/price/diff flows |
| Recovery | AMIGO/category/media/database/storage/worker failures, restart, retry and resume without partial activation |
| Performance | large synthetic catalog queries/navigation/search/filter/bulk/import memory, query plans and N+1 detection |
| Final | real full run and manifest, daily schedule, graceful restart, CI-equivalent gate, documentation/link/ID/secret/scope checks |

Synthetic data is only load/test evidence and is never counted as real import. A partial real run is reported as partial and cannot pass the full-catalog gate.

## 9. Stop conditions

Work stops with an exact report if full transport requires unknown credentials, CAPTCHA or access bypass; the source technically prohibits continuation; stable identity cannot be determined; duplicate creation begins; storage loses bytes; source structure is broadly unrecognized; Phase 1A/1B.1 foundation fails; a production secret/provider is required; or completion would require calculator/configurator/Phase 1C. Safe item-level source/media/parser failures remain visible and do not falsely become global success.

## 10. Acceptance and completion handling

Phase 1B.2 passes only when the complete allowed discovery/import has a reviewed manifest, stable identities, local media/no hotlink, idempotent no-op and resume evidence, source-removal preservation, overlay persistence, default inquiry-only behavior, complete diff/manual activation/daily schedule/bulk controls, PostgreSQL-only scalable public catalog, required tests/CI and synchronized documentation. The immutable result is written to `docs/06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md`.

Completion does not authorize Phase 1C. After the final report the work stops.
