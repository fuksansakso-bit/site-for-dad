# Implementation roadmap PROJECT_NAME

## 0. Статус и правила

| Поле | Значение |
|---|---|
| Фаза документа | Phase 1A and Phase 1B.1 completed; only Phase 1B.2 authorized/in progress; Phase 1C+ hold |
| Статус roadmap | **PHASE 1A PASSED / PHASE 1B.1 PASSED / PHASE 1B.2 AUTHORIZED / PHASE 1C+ HOLD** |
| Scope | [MVP_SCOPE](MVP_SCOPE.md) |
| Планы / evidence | [PHASE_1A_FOUNDATION_PLAN](active/PHASE_1A_FOUNDATION_PLAN.md), [PHASE_1A_FOUNDATION_REPORT](completed/PHASE_1A_FOUNDATION_REPORT.md), [PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN](active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md), [PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT](completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md), [PHASE_1B2_FULL_AMIGO_CATALOG_PLAN](active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md) |

- **ROADMAP-001 — MUST:** фазы выполняются по порядку 1A–1H; параллельный research MAY идти, но dependent implementation не обходит entry gate.
- **ROADMAP-002 — MUST:** каждая возможность включается feature flag только после собственных acceptance/security/data gates; наличие кода не равно production activation.
- **ROADMAP-003 — MUST:** незакрытый TBD использует fallback из `OPEN_QUESTIONS` или блокирует только зависимую функцию.
- **ROADMAP-004 — MUST:** change of business behavior сначала синхронизирует canonical spec, traceability и changelog.
- **ROADMAP-005 — MUST:** завершение фазы требует clean tree, reviewed migrations/artifacts, test evidence и rollback rehearsal, но не даёт автоматического разрешения на следующую фазу.

## 1. PHASE 1A — FOUNDATION

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1A-001:** создать проверяемую локальную и CI foundation для modular monorepo, web/BFF, database, object storage, worker, auth boundary и operations, не реализуя бизнес-функции MVP. |
| Зависимости | Baseline commit `7105ef03c1fb1cb726161fcbc02cbb0c340e212e`; `GLOBAL_SPEC`; ADR-0001/0006; acceptance ADR-0007–0010. |
| Входные условия | `QG-147/148` closed; Phase 0C baseline `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`; 0 critical specs `BLOCKED/CONTRADICTORY`; P0 fully classified; exact supported dependency versions reverified before bootstrap. |
| Deliverables | Monorepo skeleton; `apps/web` and `apps/worker`; domain/application/db/contracts/config/observability/testing/UI packages; local PostgreSQL/object emulator; migration baseline; environment schema; CI gates; lint/typecheck/tests; structured logging; liveness/readiness; synthetic auth/RBAC boundary; runbooks. |
| Acceptance criteria | One documented bootstrap path works from clean machine; locked install/build/test deterministic; web and worker health proven; dependency boundaries enforced; synthetic DB migration replay/recovery and storage/job contracts pass; no secret/PII in repo/logs; no catalog/import/price/preview/lead implementation. |
| Тесты | Toolchain smoke; architecture boundary; environment positive/negative; DB migration empty/upgrade/recovery; job retry/idempotency; object public/private denial; auth capability denial; health degradation; log redaction; CI reproducibility. |
| Риски | Tool/version incompatibility, oversized scaffold, secret exposure, migration lock/data loss, framework coupling. |
| Definition of Done | All Phase 1A acceptance evidence linked to requirements; ADRs accepted; local and CI green; security/recovery runbooks reviewed; tree clean; Phase 1B remains disabled. |
| Запрещённые изменения | AMIGO import/media ingestion, production data, pricing rules, catalog UI, configurator, preview, lead forms, AI, provider commitments beyond accepted ADR scope. |
| Rollback | Revert commits in documented sequence while data is synthetic; preserve migration history once shared; use ADR-0008 compensation/rebuild rehearsal; revoke any issued test credentials and remove disposable local resources. |

Подробный execution record: [PHASE_1A_FOUNDATION_PLAN](active/PHASE_1A_FOUNDATION_PLAN.md); acceptance evidence: [PHASE_1A_FOUNDATION_REPORT](completed/PHASE_1A_FOUNDATION_REPORT.md). Phase 1A имеет статус `PASSED_PHASE_1A_FOUNDATION`; отдельный переход только к Phase 1B.1 выполнен `OWNER-DECISION-010`.

## 2. PHASE 1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1B-001:** доказать authorized snapshot pipeline и публичный каталог на 32 реальных материалах без требования полного AMIGO assortment. |
| Зависимости | 1A; ADR-0002/0006/0009; AMIGO parity, catalog, sync, media specs; rights/source registers. |
| Входные условия | `OWNER-DECISION-008/009` contracts, `OWNER-DECISION-010` transition, `PASSED_PHASE_1A_FOUNDATION`, dated transport discovery, four-path/32-ID allowlist, stable numeric source identities, rights boundary и operational private media zone подтверждены. Full-export `TBD-SOURCE-AMIGO-002` перенесён в Phase 1B.2. |
| Deliverables | Dynamic catalog model и immutable AMIGO snapshots/normalized projection в PostgreSQL; authority-aware import interface; staged candidate/validation/exact diff; Business Owner approval и explicit administrator activation точной `CatalogVersion`; local overlays с declared precedence; provenance/audit/source timestamps/rollback; local licensed media binaries in object storage; 20–50 pilot materials across allowed initial families; public catalog/search/filter и version-pinned rebuildable projections; admin catalog screen. |
| Acceptance criteria | Re-import idempotent; source identity preserved; unknown fields/categories quarantined; source removal никогда автоматически не удаляет/скрывает local data или overlays; activation atomic and reversible; public reads use only the active approved PostgreSQL `CatalogVersion`; only `PUBLICATION_APPROVED` material/media public; binary availability explicit; full assortment not required. |
| Тесты | Parser/mapping fixtures; property/contract import tests; duplicate/stale/missing field; exact diff/Business Owner approval/admin activation; direct AMIGO/staging read denial; no-auto-delete on source removal; override precedence without source mutation; source/timestamp/audit completeness; projection pinning; rollback; rights revocation; public/private object access; catalog empty/filter/search/a11y/mobile; source outage fallback. |
| Риски | Undocumented export schema, wrong mapping, staged/direct-source exposure, destructive sync, override loss, mass publish, projection drift, stale availability, rights mismatch, media leakage. |
| Definition of Done | Active approved pilot `CatalogVersion` and complete audit/source/timestamp record; 32 verified materials visible only through PostgreSQL public-serving path; rollback rehearsed; unresolved items quarantined; only source card prices/local base overrides supported, no dimensional calculation implied. |
| Запрещённые изменения | Scraping/access bypass, hotlink, watermarks removal, bulk unmanaged download, auto-publication, auto-delete/hide of local data, direct public reads from AMIGO/staging, assumptions about full assortment or AMIGO API/cadence. |
| Rollback | Atomically restore the previous active `CatalogVersion`, rebuild version-pinned projections, revoke affected derivative URLs and preserve immutable evidence/audit; migration compensation only through ADR-0008. |

Phase 1B.1 completed 2026-08-03 as `PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT`; exact implementation, data/version IDs, recovery and CI evidence are in the completion report. `OWNER-DECISION-012` separately authorizes only Phase 1B.2 below.

## 3. PHASE 1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1B2-001:** расширить доказанный Phase 1B.1 pipeline до полного доступного разрешённого AMIGO catalog без live upstream dependency и без dimensional calculation. |
| Зависимости | Passed 1A/1B.1; `OWNER-DECISION-008`–`012`; ADR-0002/0006/0008/0009; catalog/parity/admin/sync/media/storage/security/performance/test specs; rights/source/pricing policies. |
| Входные условия | `PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT`; branch/baseline confirmed; Product Owner authorized only Phase 1B.2; active plan and QG-195–202; existing adapter/worker/storage foundation intact. |
| Deliverables | Dynamic full category discovery; pagination/nesting/entities/properties/compatibility source facts; stable identities; raw snapshots and retention protection; Full Catalog Import Manifest; resumable/cancellable Graphile jobs with progress; licensed local media; full source/base/card price snapshots and `PRICE_ON_REQUEST`; exact diff/review/manual catalog/price activation; preserved overlays; transactional audited bulk controls; scalable public/admin catalog; daily schedule/history. |
| Acceptance criteria | Coverage manifest accounts for every discovered/failed/skipped/duplicate/removed entity; no unhandled global failure or duplicate; repeat is no-op; resume works; media is local/no hotlink; local visibility/availability/price survives sync; source removal is non-destructive; initial accepted overlay is VISIBLE + INQUIRY_ONLY; only active PostgreSQL versions are public; manual activation/rollback and daily non-activating sync work. |
| Тесты | Unit/contract/integration/browser/recovery/performance suites named in active plan; synthetic scale set substantially exceeds real catalog but never substitutes real import evidence; CI-equivalent verification and documentation gates pass. |
| Риски | Hidden access gate/CAPTCHA, unstable identity, selector drift, duplicates, overloading source, storage loss, incomplete media/prices, overlay overwrite, mass-publish error, slow/N+1 queries. |
| Definition of Done | Accepted real full manifest/report with honest counts/categories/errors/skips; full diff and manual versions active; no-op/resume/daily/bulk/overlay/public/performance evidence; clean tree; Phase 1C absent. |
| Запрещённые изменения | Second importer; access/CAPTCHA/rate bypass; AMIGO frontend/design/code reuse; hotlink/unmanaged download/watermark removal; guessed properties/prices/zero price; auto activation/deletion; dimensional calculator/configurator/preview/AI/cart/order/WhatsApp/account/final design; production provider/secrets/deployment; Phase 1C. |
| Rollback | Cancel/drain jobs, retain checkpoint/manifest/snapshots, reactivate prior compatible CatalogVersion/PriceVersion atomically, preserve overlays/audit/source-removed history and use forward compensation for schema changes. |

Execution contract: [PHASE_1B2_FULL_AMIGO_CATALOG_PLAN](active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md). Passing Phase 1B.2 will not authorize Phase 1C.

## 4. PHASE 1C — CONFIGURATOR AND PRICING

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1C-001:** валидировать конфигурацию и воспроизводимо вычислять preliminary price только для доказанных systems/rules. |
| Зависимости | 1B; ADR-0003/0008; configurator/pricing specs; pricing policy; approved PriceVersion and compatibility/size evidence. |
| Входные условия | Закрыты rule-specific `TBD-PRICE-*`, `TBD-SIZE-001`, relevant dimension/install/mechanism TBD; approver/tolerance defined; minimum 1500 scope resolved before use. Unclosed family remains manual quote, not global blocker. |
| Deliverables | System/material/options/quantity selection; millimetre inputs; compatibility validation; price snapshot/provider; local override; immutable breakdown; preliminary price; manual quote fallback; parity fixtures/tests. |
| Acceptance criteria | Exact kopeck arithmetic; active version only; old quote reproduces; unknown/incompatible/stale data never yields numeric certainty; local override provenance/audit; several items keep own inputs/version. |
| Тесты | Unit/table/property money and dimensions; boundaries/rounding; compatibility; provider contract; stale/missing/zero prohibition; override precedence; saved snapshot replay; AMIGO parity tolerance and failure; concurrency/idempotency. |
| Риски | Wrong formula, unit/rounding error, false precision, silent repricing, minimum-price misapplication. |
| Definition of Done | Every active pricing path has approved rule, examples and parity evidence; manual fallback covers all other paths; audit and rollback to previous PriceVersion rehearsed. |
| Запрещённые изменения | Guessed formulas, implicit 1500 minimum, float money, modifying historical quote, activating price without approver/parity, presenting estimate as final offer. |
| Rollback | Deactivate bad PriceVersion/override; reactivate last approved version; preserve historical quotes; disable affected family to `PRICE_ON_REQUEST`; compensate schema forward. |

## 5. PHASE 1D — STANDARD PREVIEW

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1D-001:** дать детерминированный `STANDARD_INTERIOR_PREVIEW` на подготовленной сцене для доказанных family profiles без AI/user upload. |
| Зависимости | 1C; ADR-0004/0006; standard preview, catalog, configurator, media, performance/a11y specs. |
| Входные условия | Approved scene/assets; material-color binding; family geometry profile; supported configuration mapping; rights and visual acceptance baseline. |
| Deliverables | Prepared scene; layered renderer; perspective/scale controls; roller cloth, Zebra bands, horizontal lamellae and supported vertical behavior; deterministic output/cache; accessible/static fallback. |
| Acceptance criteria | Same inputs/profile/version produce same result; correct material/config binding; unsupported family/profile fails visibly; no user photo or generative call; reduced-motion/keyboard/text alternative works. |
| Тесты | Golden/visual regression; determinism; Zebra/roller/horizontal/vertical tables; missing/stale/revoked asset; perspective boundaries; browser/mobile/performance/a11y; cache invalidation. |
| Риски | Misleading scale/color, generic wrong geometry, heavy canvas, asset revocation. |
| Definition of Done | Four MVP family profiles are either accepted or explicitly manual/static fallback; visual baselines and renderer/profile versions recorded; AI boundary remains separate. |
| Запрещённые изменения | Treating standard preview as AI or client-photo preview, generative substitution, unlicensed asset, promise of measurement accuracy, silent generic shape. |
| Rollback | Disable affected renderer profile, serve static/product-image fallback, restore previous profile/assets/cache version. |

## 6. PHASE 1E — CART, WHATSAPP AND ORDERS

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1E-001:** собрать несколько конфигураций в корзину и безопасно передать guest lead/measurement request/WhatsApp without claiming confirmed order. |
| Зависимости | 1C; optional 1D display; cart/order/API/security specs; confirmed business/legal/privacy fields. |
| Входные условия | Lead fields/consents/legal notice approved; retention/DSR/incident owner for PII; WhatsApp template and funnel status boundary approved; rate limit/anti-abuse enabled. |
| Deliverables | Multi-item cart; price revalidation; guest lead; free measurement request; WhatsApp message preview/deep link; saved calculation; basic lead status; neutral installment flag. |
| Acceptance criteria | Registration never required; duplicated submission idempotent; price changes explicit; phone/message sanitized; consent version captured; manager handoff does not imply order/payment/installment approval. |
| Тесты | Cart math/snapshot; stale price; multi-item; guest happy/negative; duplicate/rate limit; consent/retention; WhatsApp encoding; unavailable client fallback; authorization/IDOR; notification outage. |
| Риски | PII leak, spam/duplicate lead, misleading status, message truncation, stale price. |
| Definition of Done | Guest and measurement paths pass privacy/security/a11y/E2E; runbooks and manual fallback proven; no automated supplier/installment/payment behavior. |
| Запрещённые изменения | Auto-send without confirmation, final-price/order claim, collecting excess PII, automated installment application, online payment, supplier order. |
| Rollback | Feature flags disable forms/deep link; retain/delete already collected PII by approved policy; queue retries stopped safely; cart remains local/read-only where allowed. |

## 7. PHASE 1F — ADMIN AND ACCOUNTS

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1F-001:** обеспечить RBAC operations для каталога/наличия/цен/заявок/портфолио/клиентов и базовый account saved calculations. |
| Зависимости | 1B/1C/1E; ADR-0010 accepted for public identity; auth/admin/account/content specs; legal/recovery/notification readiness. |
| Входные условия | Named roles/capabilities; bootstrap and recovery process; session policy; audit/retention; customer signup method; admin operational owners. |
| Deliverables | Admin navigation/actions for catalog, availability, prices, leads, portfolio, clients; approval separation where required; basic account and ownership-scoped saved calculations; session/recovery controls. |
| Acceptance criteria | Server-side capability checks on every action; account sees own data only; audit includes actor/time/reason/before-after; dangerous action confirms/requires permission; guest still complete. |
| Тесты | RBAC matrix/negative/IDOR; session expiry/revocation; account ownership; admin concurrency; audit immutability/redaction; portfolio rights; recovery/rate limiting; E2E/a11y. |
| Риски | Privilege escalation, bootstrap credential leak, cross-customer data, harmful admin action, weak recovery. |
| Definition of Done | Role matrix and negative tests pass; admin runbooks and access review exist; basic saved-calculation account works; no forced registration or extended CRM. |
| Запрещённые изменения | Client data export without policy, shared admin account, client-side-only auth, silently deleting audit, forcing guest registration, post-MVP account scope. |
| Rollback | Revoke sessions/roles, disable account/admin modules separately, preserve audit and immutable versions, restore prior catalog/price/content state. |

## 8. PHASE 1G — AI WINDOW VISUALIZER PILOT

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1G-001:** выпустить ограниченный private geometry-first AI pilot для рулонных и Zebra с ручной коррекцией и deterministic fallback. |
| Зависимости | 1A storage/jobs, 1B catalog/media, 1C config, 1F identity where saved result; ADR-0005/0006/0009/0010; AI specs/evaluation/security/privacy. |
| Входные условия | Legal basis/consent/notice; TTL/delete/backup policy; data residency and processor contract; provider/region/model/version/cost caps; rights-cleared evaluation dataset; quality thresholds and kill switch. |
| Deliverables | Private upload; validation/quarantine; window/sash detection; manual correction; mask; `GEOMETRIC_PREVIEW`; optional `AI_REFINED_PREVIEW`; before/after; deletion; fallback; evaluation/cost dashboard. |
| Acceptance criteria | Only roller/Zebra; private short-lived access; no protected-region change beyond tolerance; manual correction always available; AI failure returns geometric result; delete covers originals/derivatives/provider; budget/quality hard gates enforced. |
| Тесты | Malicious/oversize/orientation upload; auth/IDOR/signed URL; geometry/mask/property; provider timeout/refusal/unsafe output; retry/idempotency; protected pixels; deletion/backup; rights dataset; device/a11y; cost/latency thresholds. |
| Риски | Privacy/biometric-like inference, provider retention, hallucinated geometry, cost spike, abusive uploads, misleading output. |
| Definition of Done | Evaluation and privacy gates pass with recorded versions; kill switch/fallback/deletion/incident runbooks rehearsed; pilot scope and usage caps visible. |
| Запрещённые изменения | Public bucket/logging image URLs, training use, all-family activation, automatic every-sash recognition claim, removal of manual correction, AI-only result. |
| Rollback | Disable upload/refinement independently; stop/cancel jobs; revoke grants; execute retention deletion; keep standard/geometric fallback; revoke provider keys and preserve non-sensitive audit evidence. |

## 9. PHASE 1H — HARDENING AND RELEASE

| Поле | Содержание |
|---|---|
| ID / цель | **ROADMAP-1H-001:** доказать production safety, accessibility, performance, recovery and operability, затем выполнить контролируемый launch. |
| Зависимости | 1A–1G MVP features; accepted production hosting/storage/identity/telemetry/AI decisions; all launch-blocking TBD and legal obligations closed. |
| Входные условия | Release candidate feature inventory; production data map; threat model; approved budgets/SLOs; backups/PITR; monitoring/on-call/incident owners; rollback candidate. |
| Deliverables | Security audit; WCAG checks; performance/regional/browser/mobile tests; backup/restore rehearsal; monitoring/alerts/runbooks; privacy/analytics validation; production deployment plan; launch checklist and go/no-go record. |
| Acceptance criteria | No open critical defect or critical spec blocker; restore/rollback RTO/RPO evidence; no secrets/PII leak; supported browser/mobile/a11y/performance thresholds pass; analytics consent/minimization; owner signs go-live. |
| Тесты | SAST/dependency/secret, penetration/auth/upload/rate-limit; keyboard/screen reader/reduced motion; load/soak/failure; cross-browser/device/network; backup/restore/region/provider outage; migration/app rollback; smoke/canary. |
| Риски | Last-minute scope creep, production-only config drift, regional latency, restore failure, privacy incident, alert gaps. |
| Definition of Done | Signed launch checklist; monitored canary and rollback window; backups and incident contacts active; public docs/legal notices accurate; post-launch review scheduled. |
| Запрещённые изменения | Untested feature/vendor migration, direct production schema change, bypassed gate, real-user launch without privacy/legal/restore evidence, hidden post-MVP scope. |
| Rollback | Stop rollout/traffic, revert compatible app version or disable flags, restore previous catalog/price/assets, execute migration compensation/restore only by runbook, notify/escalate per incident plan. |

## 10. Sequence gates

| Переход | Минимальный gate |
|---|---|
| 0C → 1A | Explicit owner authorization + accepted ADR-0007–0010 + all Phase 0C stop conditions satisfied |
| 1A → 1B | Foundation DoD + authorized pilot source/rights/mapping owner + separate explicit Product Owner transition decision |
| 1B → 1C | Approved pilot catalog + rule-specific compatibility/price evidence |
| 1C → 1D | Stable published configuration/material/profile inputs |
| 1D → 1E | Price/cart contracts stable + PII/legal lead gate |
| 1E → 1F | Lead/admin operations and identity/recovery gate |
| 1F → 1G | Private media/provider/privacy/evaluation/cost gate |
| 1G → 1H | MVP feature freeze and complete release candidate |

## 11. История

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Зафиксированы последовательные Phase 1A–1H с entry, deliverables, tests, risks, DoD, forbidden changes and rollback. |
| 1.1.0 | 2026-08-02 | Phase 1A отмечена `PASSED`; добавлены completion report и обязательное отдельное письменное решение для перехода к Phase 1B. |
| 1.2.0 | 2026-08-02 | Phase 1B уточнена `OWNER-DECISION-008`: PostgreSQL хранит source/local revisions, object storage — media binaries; transport/manifest/evidence и отдельное transition decision остаются обязательными. |
| 1.3.0 | 2026-08-02 | Phase 1B синхронизирована с `OWNER-DECISION-009`: active PostgreSQL `CatalogVersion` обслуживает public runtime после staged diff/Business Owner approval/admin activation; добавлены no-auto-delete, override/audit/version/projection/rollback gates без разрешения реализации. |
| 1.4.0 | 2026-08-02 | `OWNER-DECISION-010` разрешил только Phase 1B.1 с 32-ID real pilot/public-page transport; full-catalog expansion выделен в отдельную Phase 1B.2 и остаётся на hold вместе с Phase 1C+. |
| 1.5.0 | 2026-08-03 | Phase 1B.1 отмечена passed со ссылкой на 32-variant/59-media/version/restart/CI completion evidence; Phase 1B.2/1C+ hold сохранён. |
| 1.6.0 | 2026-08-03 | `OWNER-DECISION-012` и active plan разрешили только Phase 1B.2 full authorized catalog expansion с manifest/resume/media/price/review/bulk/public/admin/performance gates; Phase 1C+ и production сохранены на hold. |
