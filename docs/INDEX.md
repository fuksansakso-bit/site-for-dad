# Карта документации PROJECT_NAME

## 0. Статус

Phase 1A, Phase 1B.1, Phase 1B.2 and Phase 1C завершены. `OWNER-DECISION-013` реализована на branch `phase/1c-configurator-pricing` от merged-main commit `3f1f70c986bd29518364a059393e9abd1b284a02`: configurator, verified server pricing, immutable quotes, minimal pricing admin and parity verification получили статус `PASSED_PHASE_1C_CONFIGURATOR_PRICING`. Phase 1D+, preview/photo/AI/cart/order/WhatsApp/payment/final design and production deployment remain prohibited.

## 1. Порядок обязательного чтения

1. [AGENTS.md](../AGENTS.md) — правила репозитория и запрет преждевременной реализации.
2. [README.md](../README.md) — короткий контекст и состояние фазы.
3. Этот index — карта документов.
4. [GLOBAL_SPEC.md](specs/GLOBAL_SPEC.md) — главный источник правды о поведении продукта.
5. [GLOSSARY.md](00-global/GLOSSARY.md) — нормативные термины.
6. [EXTERNAL_SOURCES.md](00-global/EXTERNAL_SOURCES.md) — provenance и границы внешних данных.
7. [ASSET_RIGHTS_REGISTER.md](00-global/ASSET_RIGHTS_REGISTER.md) — права, публикация, AI-use и удаление медиа.
8. [PRICING_SOURCE_POLICY.md](00-global/PRICING_SOURCE_POLICY.md) — snapshots, версии, overrides, fallback и parity.
9. [ASSUMPTIONS.md](00-global/ASSUMPTIONS.md) и [OPEN_QUESTIONS.md](00-global/OPEN_QUESTIONS.md) — неподтверждённые решения и пробелы.
10. Релевантная профильная спека из разделов ниже.
11. Для implementation readiness — [MVP scope](06-plans/MVP_SCOPE.md), [critical audit](06-plans/SPEC_READINESS_AUDIT.md), [roadmap](06-plans/IMPLEMENTATION_ROADMAP.md), стабильные Phase 1A–1C records, [Phase 1C plan](06-plans/active/PHASE_1C_CONFIGURATOR_PRICING_PLAN.md), [report](06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md) и dated pricing evidence.
12. [CHANGELOG.md](../CHANGELOG.md) — история содержательных изменений.

При конфликте действует repository precedence: `GLOBAL_SPEC` (включая перенесённые owner/partner decisions) → accepted ADR → approved профильная спецификация → governed dynamic snapshot → assumptions/open questions. Противоречие останавливает зависимую работу.

## 2. Global governance

| Документ | Назначение |
|---|---|
| [GLOBAL_SPEC.md](specs/GLOBAL_SPEC.md) | Scope, роли, flows, глобальные FR/NFR, модели, риски и phase boundaries |
| [GLOSSARY.md](00-global/GLOSSARY.md) | Единые значения catalog, price, preview, media, sync, source authority и operational system of record |
| [EXTERNAL_SOURCES.md](00-global/EXTERNAL_SOURCES.md) | 15 source records: 14 публичных AMIGO страниц и volatile customizer |
| [ASSET_RIGHTS_REGISTER.md](00-global/ASSET_RIGHTS_REGISTER.md) | Partner license, asset-level publication, provenance, AI/training/delete границы |
| [PRICING_SOURCE_POLICY.md](00-global/PRICING_SOURCE_POLICY.md) | Authorized price source, immutable versions, local rules, fallback и parity |
| [ASSUMPTIONS.md](00-global/ASSUMPTIONS.md) | Версионируемые гипотезы, которые не становятся фактом без решения |
| [OPEN_QUESTIONS.md](00-global/OPEN_QUESTIONS.md) | Канонический реестр `TBD-*`, владельцев, влияния и критериев закрытия |
| [SPEC_ROADMAP.md](00-global/SPEC_ROADMAP.md) | Фактический комплект 0B/0C, accepted Foundation ADR, gates и последовательность 1A–1H |
| [TRACEABILITY_MATRIX.md](00-global/TRACEABILITY_MATRIX.md) | 18 critical chains и полная 40-story связь со спеками, AC и tests |
| [SPEC_QUALITY_GATE.md](00-global/SPEC_QUALITY_GATE.md) | Passed gates 0B/0C/1A/1B.1/1B.2/1C; Phase 1C evidence QG-231–270 |

## 3. Product specifications

| Документ | Назначение |
|---|---|
| [FEATURE_SPEC.md](specs/01-product/FEATURE_SPEC.md) | Feature portfolio, scope, rules, failure/NFR и delivery boundary |
| [USER_STORIES.md](specs/01-product/USER_STORIES.md) | 40 полных stories гостя, клиента, менеджера, admin, owner, content, sync и AI |
| [USER_FLOWS.md](specs/01-product/USER_FLOWS.md) | End-to-end стандартные, административные, AI и failure flows |
| [ROLES_PERMISSIONS.md](specs/01-product/ROLES_PERMISSIONS.md) | Capability/RBAC/object ownership и deny-by-default |
| [ACCEPTANCE_CRITERIA.md](specs/01-product/ACCEPTANCE_CRITERIA.md) | 40 Given/When/Then criteria с негативными ветками и test links |

## 4. Domain specifications

| Документ | Назначение |
|---|---|
| [AMIGO_CATALOG_PARITY_SPEC.md](specs/02-domain/AMIGO_CATALOG_PARITY_SPEC.md) | Собственный functional coverage AMIGO без копирования code/DOM/UX |
| [CATALOG_INVENTORY_SPEC.md](specs/02-domain/CATALOG_INVENTORY_SPEC.md) | Динамические категории, нормализованные сущности, materials/properties/inventory states |
| [PRODUCT_CONFIGURATOR_SPEC.md](specs/02-domain/PRODUCT_CONFIGURATOR_SPEC.md) | Step graph, revisions, compatibility, dimensions, validation/errors |
| [PRICING_CALCULATOR_SPEC.md](specs/02-domain/PRICING_CALCULATOR_SPEC.md) | Versioned provider, exact money, source/local/override, history/fallback/parity |
| [STANDARD_INTERIOR_PREVIEW_SPEC.md](specs/02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md) | Детерминированный preview на собственной demonstration scene |
| [AI_WINDOW_VISUALIZER_SPEC.md](specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md) | Private client-photo geometry/base/optional refinement path |
| [CART_CHECKOUT_ORDERS_SPEC.md](specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) | Multi-item cart, guest checkout, WhatsApp, measure/order/warranty states |
| [INSTALLMENT_SPEC.md](specs/02-domain/INSTALLMENT_SPEC.md) | Нейтральный installment handoff до утверждения legal terms |
| [AUTH_ACCOUNTS_SPEC.md](specs/02-domain/AUTH_ACCOUNTS_SPEC.md) | Guest ownership, account projects/history/orders и session boundaries |
| [ADMIN_PANEL_SPEC.md](specs/02-domain/ADMIN_PANEL_SPEC.md) | Catalog/price/sync/media/order/content/AI administration и audit |
| [CONTENT_PORTFOLIO_SPEC.md](specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) | Partner examples, собственные работы, badge, attribution/revocation |

## 5. UX specifications

| Документ | Назначение |
|---|---|
| [INFORMATION_ARCHITECTURE.md](specs/03-ux/INFORMATION_ARCHITECTURE.md) | Sitemap, navigation, content model и ключевые task paths |
| [DESIGN_SYSTEM.md](specs/03-ux/DESIGN_SYSTEM.md) | Premium interior-tech palette/type/spacing/components/states |
| [MOTION_ANIMATION_SPEC.md](specs/03-ux/MOTION_ANIMATION_SPEC.md) | 2–3-second starfield, skip, first-visit, reduced-motion и weak-device fallback |
| [SCREEN_SPECS.md](specs/03-ux/SCREEN_SPECS.md) | Назначение, hierarchy, states/actions/errors основных экранов |
| [RESPONSIVE_SPEC.md](specs/03-ux/RESPONSIVE_SPEC.md) | Content-driven layouts, narrow/zoom/touch/device behavior |
| [ACCESSIBILITY_SPEC.md](specs/03-ux/ACCESSIBILITY_SPEC.md) | WCAG 2.2 AA target, keyboard, screen reader, focus, errors, motion |

## 6. Technical and operations specifications

| Документ | Назначение |
|---|---|
| [ARCHITECTURE.md](specs/04-technical/ARCHITECTURE.md) | Modular application, domain/adapters/workers и failure boundaries |
| [DATA_MODEL.md](specs/04-technical/DATA_MODEL.md) | Aggregates, stable UUID, source identity, versions, relations и invariants |
| [API_SPEC.md](specs/04-technical/API_SPEC.md) | Conceptual API contracts, errors, auth, ownership, idempotency/versioning |
| [AMIGO_SYNC_ARCHITECTURE.md](specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) | Source priority, capture/snapshot/staging/diff/approval/activation/rollback |
| [ASSET_MEDIA_PIPELINE.md](specs/04-technical/ASSET_MEDIA_PIPELINE.md) | Original/derivatives, validation/quarantine, rights/publication/revocation |
| [STORAGE_MEDIA.md](specs/04-technical/STORAGE_MEDIA.md) | Public/private/quarantine zones, scoped grants, deletion and backup boundary |
| [AI_PIPELINE.md](specs/04-technical/AI_PIPELINE.md) | Geometry-first jobs, protected regions, quality gates, fallback/delete |
| [SECURITY_PRIVACY.md](specs/04-technical/SECURITY_PRIVACY.md) | Threat model, controls, data classes, consent/retention/provider boundaries |
| [PERFORMANCE.md](specs/04-technical/PERFORMANCE.md) | Budget approval, critical paths, regional/device/load/degradation tests |
| [OBSERVABILITY.md](specs/04-technical/OBSERVABILITY.md) | Safe logs/metrics/traces/events/alerts and runbook contract |
| [DEPLOYMENT.md](specs/04-technical/DEPLOYMENT.md) | Environments, rollout, migrations, rollback, backup/restore and release gates |

## 7. Quality and evaluation

| Документ | Назначение |
|---|---|
| [TEST_STRATEGY.md](quality/TEST_STRATEGY.md) | 40 critical scenarios и общий unit/property/contract/integration/E2E/visual/a11y/security/privacy/performance/recovery plan |
| [AI_EVALUATION_SPEC.md](evaluations/AI_EVALUATION_SPEC.md) | Rights-cleared benchmark, stage metrics, hard gates, human/privacy/performance/cost evaluation |

## 8. Implementation-readiness and Phase 1A artifacts

| Документ | Назначение |
|---|---|
| [MVP_SCOPE.md](06-plans/MVP_SCOPE.md) | Frozen first-launch scope: 20 capabilities, safety boundaries and 15 post-MVP items |
| [SPEC_READINESS_AUDIT.md](06-plans/SPEC_READINESS_AUDIT.md) | Audit 14 critical specs по 15 dimensions и targeted contradiction fixes |
| [IMPLEMENTATION_ROADMAP.md](06-plans/IMPLEMENTATION_ROADMAP.md) | Phase 1A–1H with entry, deliverables, tests, risks, DoD, forbidden changes and rollback |
| [PHASE_1A_TECHNOLOGY_EVALUATION.md](06-plans/PHASE_1A_TECHNOLOGY_EVALUATION.md) | Stack comparison, migration/secrets baseline and official evidence |
| [PHASE_1A_FOUNDATION_PLAN.md](06-plans/active/PHASE_1A_FOUNDATION_PLAN.md) | Completed Foundation execution record; Phase 1B excluded |
| [PHASE_1A_FOUNDATION_REPORT.md](06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md) | Actual applications/packages, commits, migrations, tests, CI evidence, skipped scope and acceptance result |
| [PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md](06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md) | Storage recovery, real 32-variant/59-media run, versions/publication, restart/idempotency, CI and final acceptance evidence |
| [PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md](06-plans/active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md) | Authorized 32-ID pilot, scope, transport, execution stages, commits, stop and acceptance conditions |
| [PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md](06-plans/active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md) | Authorized full-catalog expansion scope, ownership/runtime boundaries, stages, exact commits, stop and acceptance conditions |
| [PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md](06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md) | Real manifest/version/media/governance/restart/no-op/public/CI evidence and final Phase 1B.2 acceptance |
| [PHASE_1C_CONFIGURATOR_PRICING_PLAN.md](06-plans/active/PHASE_1C_CONFIGURATOR_PRICING_PLAN.md) | Authorized Phase 1C scope, proven-rule boundary, stages, logical commits, acceptance and Phase 1D hold |
| [PHASE_1C_CONFIGURATOR_PRICING_REPORT.md](06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md) | PostgreSQL/configurator/pricing/parity/quote/admin/test/CI/PR evidence and final Phase 1C acceptance |

## 9. Architecture decisions

| ADR | Зафиксированная граница |
|---|---|
| [ADR-0001](adr/ADR-0001-application-architecture.md) | Модульное приложение и отдельный worker execution boundary |
| [ADR-0002](adr/ADR-0002-amigo-data-integration.md) | AMIGO snapshot/staging/diff/approval/activation/rollback |
| [ADR-0003](adr/ADR-0003-pricing-engine.md) | Versioned pricing provider, exact money и immutable quote history |
| [ADR-0004](adr/ADR-0004-standard-preview-renderer.md) | Детерминированный standard preview, независимый от AI |
| [ADR-0005](adr/ADR-0005-ai-visualization-pipeline.md) | Geometry-first base и optional constrained refinement |
| [ADR-0006](adr/ADR-0006-media-storage.md) | Local immutable media, derivatives и public/private zones |
| [ADR-0007](adr/ADR-0007-foundation-application-stack.md) | **Accepted:** Node/TypeScript/pnpm/Next.js modular Foundation topology and Windows 11 support |
| [ADR-0008](adr/ADR-0008-postgresql-and-migration-safety.md) | **Accepted:** PostgreSQL/Prisma, reviewed migrations and expand/contract recovery |
| [ADR-0009](adr/ADR-0009-object-storage-and-background-jobs.md) | **Accepted:** S3-compatible object port and separate Graphile Worker |
| [ADR-0010](adr/ADR-0010-identity-secrets-and-observability-boundary.md) | **Accepted:** identity/secrets/OTLP boundary; production providers deferred |

## 10. Research evidence

| Документ | Назначение |
|---|---|
| [AMIGO public parity snapshot](research/AMIGO_PUBLIC_PARITY_SNAPSHOT_2026-08-02.md) | Read-only наблюдения 14 public URLs и calculator customizer на 2026-08-02; taxonomy/flow/filters/source categories/gaps |
| [AMIGO Phase 1B.1 transport discovery](research/AMIGO_PILOT_TRANSPORT_DISCOVERY_2026-08-02.md) | Priority discovery, selected public-page transport, stable IDs, 32-item manifest boundary, media/security controls and residual full-export gate |
| [AMIGO Phase 1B.2 full transport discovery](research/AMIGO_FULL_CATALOG_TRANSPORT_DISCOVERY_2026-08-03.md) | Real 114-page dynamic discovery: 28 categories, 56 systems, 9 models, 1655 variants, semantic source version, 0 failures and explicit warnings; accepted import/activation is linked in the completion report |
| [AMIGO Phase 1C pricing verification](research/AMIGO_PRICING_VERIFICATION_2026-08-08.md) | Public Grozny-context calculator source version, hashes, four verified MVP rule scopes, 40 fixtures and safe fallback boundary |

Research snapshot не является вечным catalog/price fact. Нормативное поведение задают global/profile specs, а динамические значения требуют authorized source snapshot и verification.

## 11. Repository documents

| Документ | Назначение |
|---|---|
| [AGENTS.md](../AGENTS.md) | Обязательные правила, порядок чтения, TBD/ADR/privacy/tests/gates |
| [README.md](../README.md) | Короткий вход и статус |
| [CHANGELOG.md](../CHANGELOG.md) | Keep a Changelog record |
| [reference/README.md](../reference/README.md) | Provenance/rights/usage rules для будущих локальных референсов |

## 12. Как находить ответ

- Поведение продукта — `GLOBAL_SPEC`, затем accepted ADR в его границах, затем профильная спека.
- Что именно подтверждено владельцем/AMIGO — `GLOBAL_SPEC`, `EXTERNAL_SOURCES`, `ASSET_RIGHTS_REGISTER`.
- Кто определяет конкретное поле — authority matrix `OWNER-DECISION-008`: AMIGO для source-backed catalog/image/base-price данных; Business Owner для local availability/visibility/override/portfolio/commercial условий.
- Откуда публичное приложение читает данные — `OWNER-DECISION-009`: только активная одобренная PostgreSQL `CatalogVersion`/transactional state; AMIGO и staging не являются runtime read path, а cache/search/analytics projections остаются rebuildable и version-pinned.
- Можно ли публиковать изображение — asset-level state в `ASSET_RIGHTS_REGISTER` и media specs.
- Почему цена недоступна или как воспроизводится — `PRICING_SOURCE_POLICY` и `PRICING_CALCULATOR_SPEC`.
- Как работает AMIGO parity/sync — parity spec, sync architecture и ADR-0002.
- Чем отличаются preview — standard preview spec, AI visualizer spec и ADR-0004/0005.
- Кто может выполнить действие — `ROLES_PERMISSIONS` и relevant domain spec.
- Каких данных не хватает — `OPEN_QUESTIONS` по уникальному `TBD-*`.
- Как требование проверяется — `TRACEABILITY_MATRIX`, AC и `TEST_STRATEGY`.
- Можно ли начинать следующий код — нет: Phase 1C завершена, а Phase 1D+, preview/photo/AI/cart/order/WhatsApp/payment и production требуют нового письменного разрешения.

## 13. Правило навигации

Локальные ссылки MUST вести только к существующим файлам. Не созданный будущий artifact упоминается как концепция/TBD без ложной ссылки. Содержательное изменение синхронизирует каноническую spec, затронутые governance/profile docs, traceability и `CHANGELOG.md`.
