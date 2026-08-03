# Acceptance criteria PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — 40 проверяемых критериев |
| Версия | 0.2.0 |
| Дата | 2026-08-02 |
| Stories | [USER_STORIES.md](USER_STORIES.md) |
| Test source | [TEST_STRATEGY.md](../../quality/TEST_STRATEGY.md) |

## 1. Правила

- Given задаёт доказуемые preconditions и versions; When — одно наблюдаемое действие; Then — проверяемый результат.
- Positive acceptance не заменяет negative/failure clause.
- `BLOCKED_TBD` означает, что safe fallback можно принять сейчас, а основной результат нельзя считать approved до перечисленных решений.
- Деньги сравниваются exact minor units/decimal rules, изображения — по geometry/invariant/visual baselines, permissions — по full actor/object matrix.
- Критерий не считается пройденным без связанного test scenario с теми же версиями и inputs.

## 2. Partner, catalog и content

### AC-PARTNER-001

- **Given:** существует active `PartnerRelationship` с `AUTHORIZED_PARTNER_SOURCE`, permission scope/date/owner confirmation и допустимым badge либо text fallback.
- **When:** public partner statement отображается или asset публикуется.
- **Then:** statement соответствует scope, asset имеет `PARTNER_LICENSE` + asset-level `PUBLICATION_APPROVED`, provenance и brand notes.
- **Negative:** revoked/missing scope блокирует новую публикацию и не оставляет misleading badge.
- **Links:** `PARTNER-001`–`007`, `US-OWNER-001`; `TS-PARTNER-001`.

### AC-AMIGO-PARITY-001

- **Given:** source snapshot содержит category/system, но local states проверяются независимо.
- **When:** гость открывает catalog parity surface.
- **Then:** locally ready entity доступна по собственному UI, а неполная entity честно `DEFERRED/BLOCKED` без автоматической price/availability claim.
- **Negative:** отсутствие source/runtime не ломает active local catalog.
- **Links:** `AMIGO-PARITY-001`–`005`, `US-GUEST-001`; `TS-AMIGO-PARITY-001`.

### AC-CATALOG-001

- **Given:** variants имеют verified property mappings и approved assets.
- **When:** гость применяет search и несколько filters.
- **Then:** results удовлетворяют всем выбранным semantics, сохраняют stable variant IDs и показывают только подтверждённые свойства.
- **Negative:** unknown property не трактуется как положительное совпадение.
- **Links:** `FR-CATALOG-001`, `US-GUEST-002`; `TS-CATALOG-001`.

### AC-CATALOG-DYNAMIC-001

- **Given:** staged source category неизвестного ранее slug/type прошла schema validation.
- **When:** администратор создаёт mapping и approval states.
- **Then:** category может стать active через данные/configuration без code release; четыре readiness states остаются независимыми.
- **Negative:** schema/mapping conflict оставляет entity staged/hidden.
- **Links:** `FR-CATALOG-016`–`020`, `US-ADMIN-001`; `TS-CATALOG-DYNAMIC-001`.

### AC-ASSET-MAP-001

- **Given:** разрешённый source original и partner scope доступны.
- **When:** content manager регистрирует asset.
- **Then:** сохраняются original hash, source/rightsholder/basis/date/restrictions, domain mapping, assetRole и derivative graph до publication review.
- **Negative:** duplicate/hash/mapping conflict переводит asset в quarantine и блокирует delivery.
- **Links:** `ASSET-001`–`015`, `US-CONTENT-001`; `TS-ASSET-MAP-001`.

### AC-PORTFOLIO-001

- **Given:** content item имеет происхождение и approved publication record.
- **When:** item появляется в portfolio/catalog examples.
- **Then:** owner-created work маркируется локально, AMIGO example — как партнёрский пример, авторство не смешивается.
- **Negative:** missing rights/PII review blocks publication.
- **Links:** `US-CONTENT-002`; `TS-PORTFOLIO-001`.

### AC-BADGE-001

- **Given:** badge asset или text fallback разрешён partner record.
- **When:** content manager публикует trust signal.
- **Then:** placement, alt/label и attribution соответствуют brand notes; version traceable.
- **Negative:** revoke removes asset from all surfaces and uses truthful text/no signal per scope.
- **Links:** `PARTNER-006/007`, `US-CONTENT-003`; `TS-BADGE-001`.

### AC-ASSET-REVOKE-001

- **Given:** published asset has original/derivative/usage graph.
- **When:** authorized actor revokes publication.
- **Then:** delivery/cache access terminates, derivatives/usages are blocked, audit retained and deletion follows policy.
- **Negative:** retries are idempotent and historical records do not republish asset.
- **Links:** `ASSET-012/015`, `US-CONTENT-004`; `TS-ASSET-REVOKE-001`.

## 3. Configure, price и cart

### AC-CONFIG-001

- **Given:** active family/system/model and evidence-backed compatibility/constraints.
- **When:** user completes all required steps.
- **Then:** configuration becomes `VALID`, stores normalized inputs/revision and exposes only compatible next options.
- **Negative:** unknown/invalid combination identifies fields/reason and cannot quote as valid.
- **Links:** `FR-CONFIG-001`–`008`, `US-GUEST-003`; `TS-CONFIG-001`.

### AC-PRICE-001

- **Given:** valid configuration and one active verified PriceVersion applicable to all inputs.
- **When:** user requests calculation.
- **Then:** exact amount/currency/breakdown/version/input snapshot and `PRELIMINARY` label are immutable and reproducible.
- **Negative:** missing rule/version returns `UNAVAILABLE/Цена уточняется`, never `0` or guessed amount.
- **Status:** `BLOCKED_TBD` for actual formula; fallback criterion ready.
- **Links:** `FR-PRICE-001`, `US-GUEST-004`; `TS-PRICE-001`.

### AC-CART-001

- **Given:** guest/customer owns an active cart and valid configuration revision.
- **When:** item is added, edited, duplicated, quantity-changed or removed.
- **Then:** only targeted item/revision changes; price status and totals are recomputed with visible stale/unavailable states.
- **Negative:** retry does not duplicate unintended item and stale quote is not presented current.
- **Links:** `FR-CART-001`–`007`, `US-GUEST-007`; `TS-CART-001`.

### AC-QUOTE-HISTORY-001

- **Given:** owned saved quote references historical PriceVersion.
- **When:** current price rules change and client reopens project.
- **Then:** original amount/inputs/version remain unchanged; recalculation creates a new revision with explicit comparison.
- **Negative:** retired source data cannot orphan or rewrite history.
- **Links:** `PRICING-HISTORY-001`, `US-CUSTOMER-003`; `TS-QUOTE-HISTORY-001`.

### AC-PRICE-ACTIVATE-001

- **Given:** staged PriceVersion has provenance, validation, parity results, effective time and approvals.
- **When:** actor with role `OWNER` or `ADMIN` reviews the exact diff and explicitly confirms activation.
- **Then:** attempt/outcome are audited; new calculations atomically use it; existing quotes retain previous versions; rollback pointer exists.
- **Negative:** any other role, missing diff confirmation, failed validation/parity or conflict keeps current version active and records a safe audit outcome.
- **Status:** `BLOCKED_TBD` until source version/rules exist; roles and tolerance are approved.
- **Links:** `PRICING-VERSION-*`, `US-ADMIN-004`; `TS-PRICE-ACTIVATE-001`.

### AC-QUOTE-CONFIRM-001

- **Given:** manager has verified measurement inputs and price authority.
- **When:** final quote is issued.
- **Then:** it is a new immutable revision with source/local adjustments, actor, reason and client-visible explanation.
- **Negative:** unapproved adjustment/rule remains draft and cannot be marked confirmed.
- **Links:** `US-MANAGER-003`, `TBD-PRICE-009/010`; `TS-QUOTE-CONFIRM-001`.

## 4. Preview и AI

### AC-STANDARD-PREVIEW-001

- **Given:** valid supported configuration and local approved material/hardware assets.
- **When:** standard scene is rendered or selection changes.
- **Then:** deterministic output reflects exact system/material/color/control/position revision and has equivalent textual summary.
- **Negative:** missing mapping never substitutes another material; fallback explains unavailability.
- **Links:** `FR-STANDARD-PREVIEW-001`–`008`, `US-GUEST-005`; `TS-STANDARD-PREVIEW-001`.

### AC-AI-UPLOAD-001

- **Given:** user accepted notice and job-scoped private upload is authorized.
- **When:** AI worker validates the file.
- **Then:** signature/MIME/size/orientation/malware/quality policy is applied, prohibited metadata stripped and no content/URL logged.
- **Negative:** invalid/suspicious input is rejected and inaccessible after cleanup.
- **Links:** `US-AI-001`, `NFR-UPLOAD-*`; `TS-AI-UPLOAD-001`.

### AC-GEOMETRY-001

- **Given:** validated photo, confirmed target geometry and exact product/material mapping.
- **When:** base renderer creates a visualization.
- **Then:** perspective, frame/handle/protected regions, occlusions, multiple sashes and selected material meet benchmark invariants.
- **Negative:** low confidence/unsupported shape routes manual correction or failure, not fabricated success.
- **Links:** `FR-VIS-*`, `US-AI-002`; `TS-GEOMETRY-001`.

### AC-AI-VIS-001

- **Given:** guest has valid configuration, private photo and confirmed/corrected window geometry.
- **When:** visualization completes.
- **Then:** private base result can be compared/attached through opaque reference and the user can delete it.
- **Negative:** detection/provider failure preserves manual/base path and never publishes input/output.
- **Status:** quality thresholds/TTL/provider `BLOCKED_TBD`; geometry/fallback contract ready.
- **Links:** `FR-AI-VIS-001`, `US-GUEST-006`; `TS-AI-VIS-001`.

### AC-AI-REFINE-001

- **Given:** base render passed invariants and approved provider/purpose is available.
- **When:** optional refinement runs.
- **Then:** only allowed blending changes survive protected-region/product-identity comparison; revision is labelled AI-refined.
- **Negative:** drift/outage discards refinement and returns unchanged base.
- **Links:** `FR-VIS-013`–`017`, `US-AI-003`; `TS-AI-REFINE-001`.

### AC-VIS-DELETE-001

- **Given:** owner controls a visualization graph with original/mask/output/job records.
- **When:** delete is confirmed or TTL expires.
- **Then:** access is revoked immediately, jobs stop/ignore outputs, all objects follow idempotent deletion and minimal audit remains.
- **Negative:** stale URLs/tokens no longer resolve; backup handling follows approved policy.
- **Links:** `NFR-PRIV-*`, `US-CUSTOMER-004`; `TS-VIS-DELETE-001`.

## 5. Handoff, order и installment

### AC-WHATSAPP-001

- **Given:** cart/project has a share-safe snapshot and confirmed WhatsApp route.
- **When:** guest chooses consultation/measurement.
- **Then:** editable message contains opaque reference and minimal approved summary; free service statement matches business scope.
- **Negative:** private media URL/internal rule/credential is absent; deep-link failure offers confirmed fallback contact.
- **Links:** `US-GUEST-012`, `FTR-019/020`; `TS-WHATSAPP-001`.

### AC-MANAGER-CONTEXT-001

- **Given:** authorized assigned manager and valid handoff reference.
- **When:** reference is resolved.
- **Then:** only support-approved cart/quote/preview metadata is shown with expiry and audit.
- **Negative:** invalid/expired/unauthorized reference returns neutral result without resource leak.
- **Links:** `US-MANAGER-004`; `TS-MANAGER-CONTEXT-001`.

### AC-INSTALLMENT-001

- **Given:** installment terms/provider/legal eligibility are unresolved.
- **When:** any public surface mentions installment or user submits interest.
- **Then:** exact neutral phrase is used and handoff records only interest/context.
- **Negative:** no `0%`, no-overpayment, down-payment, term, approval or universal eligibility claim appears.
- **Links:** `FR-INSTALLMENT-001`, `US-GUEST-008`; `TS-INSTALLMENT-001`.

### AC-ORDER-001

- **Given:** authorized manager opens a lead in allowed state/version.
- **When:** manager applies an allowed transition with required evidence/reason.
- **Then:** one transition commits, audit/client-safe mapping updates and no automatic order is created from handoff alone.
- **Negative:** invalid/duplicate/stale transition makes no partial change.
- **Status:** exact operational matrix `BLOCKED_TBD-BIZ-004`.
- **Links:** `FR-ORDER-001`, `US-MANAGER-001`; `TS-ORDER-001`.

### AC-MEASURE-001

- **Given:** request is within confirmed region/service scope and contact exists.
- **When:** manager schedules through approved process.
- **Then:** request/slot/status/actor are recorded and client sees only confirmed timing.
- **Negative:** no slot/process evidence leaves state requested; no fake online booking.
- **Links:** `FR-MEASURE-*`, `US-MANAGER-002`; `TS-MEASURE-001`.

### AC-ORDER-STATUS-001

- **Given:** authenticated customer owns a linked lead/order.
- **When:** account status is opened.
- **Then:** customer-safe mapped state, last update and allowed action display without internal notes.
- **Negative:** another customer's identifier reveals nothing.
- **Links:** `US-CUSTOMER-005`; `TS-ORDER-STATUS-001`.

### AC-WARRANTY-001

- **Given:** approved warranty/legal process and identifiable order or manual verification path.
- **When:** manager records a claim.
- **Then:** issue, minimal evidence, acknowledgement, inspection/outcome state and statutory-rights safeguard are tracked.
- **Negative:** missing order or unproven exclusion does not cause automatic rejection.
- **Status:** `BLOCKED_TBD-WARRANTY-001` for operational timings/evidence.
- **Links:** `US-MANAGER-005`; `TS-WARRANTY-001`.

## 6. Identity, admin и governance

### AC-AUTH-001

- **Given:** approved identity method and account exist.
- **When:** valid/invalid/expired login or recovery is attempted.
- **Then:** valid actor gets scoped session; failures are neutral, rate-limited and do not enumerate accounts.
- **Negative:** session alone never bypasses object ownership/admin capability.
- **Status:** method `BLOCKED_TBD-ACCOUNT-*`; authorization behavior ready.
- **Links:** `FR-AUTH-001`, `US-CUSTOMER-001`; `TS-AUTH-001`.

### AC-PROJECT-SAVE-001

- **Given:** authenticated account and valid unclaimed guest ownership token.
- **When:** user claims project.
- **Then:** attach is idempotent, revisions/history preserved and token revoked/rotated by policy.
- **Negative:** expired/already-owned token reveals no owner and changes nothing.
- **Links:** `US-CUSTOMER-002`; `TS-PROJECT-SAVE-001`.

### AC-ADMIN-001

- **Given:** admin has exact capability and current record version.
- **When:** one allowed catalog/admin state mutation is submitted with reason.
- **Then:** validation passes, version increments atomically and audit records before/after.
- **Negative:** permission/version/validation conflict makes no partial mutation.
- **Links:** `FR-ADMIN-001`, `US-ADMIN-002`; `TS-ADMIN-001`.

### AC-SEC-001

- **Given:** full actor/object/action matrix including anonymous, other-owner, stale/revoked and service identities.
- **When:** each protected operation is attempted.
- **Then:** only exact authorized cases succeed; denied cases are neutral and audited without sensitive payload.
- **Negative:** ID guessing, role header changes, stale token and retry do not escalate access.
- **Links:** `NFR-SEC-001`, `US-ADMIN-003`; `TS-SEC-001`.

### AC-ROLLBACK-001

- **Given:** authorized actor, previous valid revision and impact preview.
- **When:** rollback is confirmed with reason.
- **Then:** active pointers switch atomically, cache/delivery is invalidated, history preserved and health verified.
- **Negative:** incomplete rollback triggers idempotent compensation/alert, never silent mixed state.
- **Links:** `US-ADMIN-005`; `TS-ROLLBACK-001`.

### AC-OWNER-DASHBOARD-001

- **Given:** source modules report blocked/stale/pending states with quality metadata.
- **When:** owner opens/filter dashboard.
- **Then:** counts and items distinguish unknown from zero/healthy and link to evidence/owner/action.
- **Negative:** incomplete telemetry is labelled incomplete.
- **Links:** `US-OWNER-002`; `TS-OWNER-DASHBOARD-001`.

### AC-BUSINESS-RULE-001

- **Given:** open TBD has owner, impact, evidence and closure criterion.
- **When:** owner records an answer.
- **Then:** canonical source/changelog/status/date/link update and affected gate/tests rerun before use.
- **Negative:** ambiguous answer remains open with safe behavior.
- **Links:** `US-OWNER-003`, `FTR-030`; `TS-BUSINESS-RULE-001`.

## 7. Sync, quality и accessibility

### AC-AMIGO-SYNC-001

- **Given:** approved transport/process and source context.
- **When:** sync capture begins.
- **Then:** immutable versioned capture and staged normalization are recorded; active data remains untouched until approval.
- **Negative:** source/auth/format failure leaves current active data and produces auditable failed run.
- **Status:** transport/cadence `BLOCKED_TBD-SOURCE-AMIGO-002`.
- **Links:** `AMIGO-SYNC-001`, `US-SYNC-001`; `TS-AMIGO-SYNC-001`.

### AC-SYNC-DIFF-001

- **Given:** previous active and new staged normalized snapshots.
- **When:** diff runs.
- **Then:** additions/changes/removals/conflicts include stable mapping, field/relationship impact, severity and validation result.
- **Negative:** ambiguous mapping/schema drift blocks affected activation.
- **Links:** `US-SYNC-002`; `TS-SYNC-DIFF-001`.

### AC-SYNC-ROLLBACK-001

- **Given:** activated run and previous valid pointers.
- **When:** approved rollback executes or post-activation health fails.
- **Then:** catalog/price pointers and caches return consistently, run marked rolled back and failed evidence retained.
- **Negative:** repeated command is idempotent and does not oscillate versions.
- **Links:** `US-SYNC-003`; `TS-SYNC-ROLLBACK-001`.

### AC-PERF-001

- **Given:** representative low-end device/network and cold/warm routes.
- **When:** user opens primary funnel without invoking preview/AI.
- **Then:** usable catalog/configurator loads within approved budgets and heavy modules/assets load on intent.
- **Negative:** save-data/offline dependency degradation keeps textual/manual route usable.
- **Status:** numeric budgets `BLOCKED_TBD-INFRA-*`.
- **Links:** `NFR-PERF-001`, `US-GUEST-009`; `TS-PERF-001`.

### AC-PRIV-001

- **Given:** data inventory, notice and approved purpose/retention policy for client photo.
- **When:** user uploads, accesses and deletes a visualization.
- **Then:** storage/delivery/job/log/analytics honor private scope and deletion graph; no training use occurs.
- **Negative:** public URL, unauthorized account, expired token and log search cannot retrieve content.
- **Status:** exact TTL/legal basis/subprocessors `BLOCKED_TBD-PRIV-*`.
- **Links:** `NFR-PRIV-001`, `US-GUEST-010`; `TS-PRIV-001`.

### AC-ACCESS-001

- **Given:** keyboard-only, supported screen reader, 200%/400% zoom, high contrast and reduced-motion settings.
- **When:** user completes catalog → config → error correction → handoff.
- **Then:** all functions, labels, focus, announcements and summaries are perceivable/operable without time/motion trap.
- **Negative:** canvas/drag/animation has keyboard/text/no-motion equivalent.
- **Links:** `NFR-ACCESS-001`, `US-GUEST-011`; `TS-ACCESS-001`.

## 8. Coverage и completion rule

| Area | AC count | Critical negative behavior |
|---|---:|---|
| Partner/catalog/content | 8 | No unlicensed/mismapped/auto-published content |
| Configure/price/cart | 6 | No invalid config, fake zero or history rewrite |
| Preview/AI | 6 | No material substitution, geometry fabrication or public photo |
| Handoff/order/installment | 7 | No order/financial promise from handoff |
| Identity/admin/governance | 7 | No ownership/role/approval bypass |
| Sync/quality/accessibility | 6 | No partial activation or inaccessible-only route |
| **Total** | **40** | Each has one named `TS-*` |

## 9. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены 40 Given/When/Then criteria с negative clauses, stories, requirements и reserved test IDs. |
| 0.2.0 | 2026-08-02 | `AC-PRICE-ACTIVATE-001` закрепил OWNER/ADMIN, exact diff, confirmation и audit; source/rule gate сохранён. |
