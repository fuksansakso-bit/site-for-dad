# Critical specification readiness audit PROJECT_NAME

## 0. Audit result

| Поле | Результат |
|---|---|
| Дата | 2026-08-02 |
| Фаза | 0C — Implementation Readiness |
| Проверено | 14 обязательных документов |
| `READY` | 0 |
| `READY_WITH_NON_BLOCKING_TBD` | **14** |
| `BLOCKED` | **0** |
| `NEEDS_EXPANSION` | **0** |
| `CONTRADICTORY` | **0 после корректировок** |
| Итог для Phase 1A | **PASS — critical-spec stop condition снят; отдельные ADR acceptance и owner authorization всё ещё обязательны** |

`READY_WITH_NON_BLOCKING_TBD` оценивается относительно старта синтетической/local Foundation Phase 1A. Некоторые вопросы имеют классификацию `BLOCKER_BEFORE_FEATURE` и обязаны остановить Phase 1B–1G activation; они не являются пробелом Foundation contract и не разрешают опасный fallback.

## 1. Метод и шкала

Для каждого документа проверены: normative requirements (`N`), inputs (`I`), outputs (`O`), states (`S`), transitions (`Tr`), business rules (`B`), errors (`E`), fallback (`F`), edge cases (`Ed`), security/privacy (`Sec`), acceptance criteria (`AC`), tests (`T`), traceability (`Tx`), dependencies (`D`) и open questions (`Q`).

- `✓` — измерение явно определено в документе;
- `↗` — локальная граница определена, детали канонически делегированы указанной профильной спецификации;
- `TBD` — contract/fallback определён, exact operational value остаётся зарегистрированным gate;
- `—` — измерение неприменимо к типу документа; отсутствие обосновано, а не скрыто.

Статусы:

- `READY` — требуемый contract полон и нет влияющих открытых вопросов;
- `READY_WITH_NON_BLOCKING_TBD` — contract/fallback полны, оставшиеся вопросы имеют явный later-feature gate;
- `BLOCKED` — неизвестное не позволяет безопасно начать Foundation;
- `NEEDS_EXPANSION` — отсутствует необходимый contract dimension;
- `CONTRADICTORY` — действует неразрешённый конфликт источников.

## 2. Dimension matrix

| Документ | N | I | O | S | Tr | B | E | F | Ed | Sec | AC | T | Tx | D | Q | Статус |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `GLOBAL_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `AMIGO_CATALOG_PARITY_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `CATALOG_INVENTORY_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `PRODUCT_CONFIGURATOR_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `PRICING_CALCULATOR_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `STANDARD_INTERIOR_PREVIEW_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `AI_WINDOW_VISUALIZER_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `ADMIN_PANEL_SPEC.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `ARCHITECTURE.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ↗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `DATA_MODEL.md` | ✓ | ✓ | ✓ | ✓ | ↗ | ↗ | ✓ | ↗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `API_SPEC.md` | ✓ | ✓ | ✓ | ↗ | ↗ | ↗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `AMIGO_SYNC_ARCHITECTURE.md` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `SECURITY_PRIVACY.md` | ✓ | ✓ | ✓ | ↗ | ↗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |
| `TEST_STRATEGY.md` | ✓ | ↗ | ↗ | ↗ | ↗ | ↗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | TBD | `READY_WITH_NON_BLOCKING_TBD` |

`↗` означает осознанное разделение ответственности: например, API не дублирует domain state machines, data model не дублирует feature fallbacks, а test strategy ссылается на canonical inputs/outputs and transitions.

## 3. Document conclusions

| Документ | Основание readiness | Remaining gate, не блокирующий Foundation |
|---|---|---|
| `GLOBAL_SPEC.md` | Scope, roles, flows, models, states, NFR, risks, errors/fallback and gates present; Phase 0C scope synchronized. | P0/P1 operational values close by deadlines in `OPEN_QUESTIONS`; no guesses. |
| `AMIGO_CATALOG_PARITY_SPEC.md` | Category target, functional matrix, provenance, validation/failure/rollback and tests explicit. | Authorized factual inventory/transport before Phase 1B activation. |
| `CATALOG_INVENTORY_SPEC.md` | Entity/version/readiness/availability models and transitions prevent auto-publication. | Actual 20–50 pilot records, source and inventory owner before public catalog. |
| `PRODUCT_CONFIGURATOR_SPEC.md` | Aggregate, step schema, state machine, validation precedence, dimension contract and manual fallback complete. | Compatibility, size, measurement/mount rules before each Phase 1C path. |
| `PRICING_CALCULATOR_SPEC.md` | Provider/version/quote model, exact arithmetic, errors/degradation and parity contract complete. | Approved formula/PriceVersion/tolerance; 1500 minimum remains unused. |
| `STANDARD_INTERIOR_PREVIEW_SPEC.md` | Separate deterministic result, inputs/outputs, layer/family/state/error/security/test contract complete. | `TBD-PREVIEW-001` scene/profile coverage and rights-approved assets before 1D. |
| `AI_WINDOW_VISUALIZER_SPEC.md` | Geometry-first flow, manual correction, protected regions, optional refinement, recovery/privacy/tests explicit. | Provider, legal/TTL, benchmark, limits and cost gates before 1G. |
| `ADMIN_PANEL_SPEC.md` | Capabilities, workflows, form states, validation, audit/security and negative tests complete. | Identity method/final role assignments and dependent feature data before 1F. |
| `ARCHITECTURE.md` | Logical modules, sync/async boundaries, adapters, degradation, security and acceptance defined. | ADR-0007–0010 accepted 2026-08-02; no remaining Foundation architecture blocker. |
| `DATA_MODEL.md` | Aggregates, keys, classification, deletion, compatibility/migration invariants and tests defined. | Physical schema/tool only after ADR-0008; feature fields use source data. |
| `API_SPEC.md` | Versioning, envelopes, resource/command/event contracts, auth, errors, pagination/idempotency defined. | Concrete route freeze follows its implementation phase; no external API implied. |
| `AMIGO_SYNC_ARCHITECTURE.md` | Capture→snapshot→staging→diff→approve→activate/rollback, concurrency and failures complete. | `TBD-SOURCE-AMIGO-002` before actual capture, not before synthetic ports. |
| `SECURITY_PRIVACY.md` | Threats, auth/web/upload/provider, data inventory, secrets/logging, retention/incidents and tests defined. | Exact legal basis/retention/providers before public PII/media/AI. |
| `TEST_STRATEGY.md` | Risk layers, 40 scenarios, parity/AI/a11y/security/recovery protocols and CI policy defined. | Execution evidence/fixtures arrive phase-by-phase; thresholds are approved before use. |

## 4. Real gaps found and disposition

| Finding | Severity before fix | Disposition in Phase 0C | Verification |
|---|---|---|---|
| `GLOBAL_SPEC` placed specialized specs above accepted ADR, conflicting with repository precedence. | `CONTRADICTORY` | `GLOBAL_SPEC` 0.6.0 now uses Global → accepted ADR → approved specialized spec; dynamic snapshots cannot override behavior. | Compare `AGENTS §2` and `GLOBAL_SPEC §1`. |
| ADR-0004 and traceability called standard prepared-scene output `GEOMETRIC_PREVIEW`, mixing it with client-photo geometry. | `CONTRADICTORY` | Standard result renamed there to `STANDARD_INTERIOR_PREVIEW`; client-photo types remain `GEOMETRIC_PREVIEW`/`AI_REFINED_PREVIEW`. | ADR-0004, preview specs, glossary, traceability. |
| Global/account assumptions did not reflect owner-frozen basic account, AI family scope and online-payment deferral. | High scope drift | `MVP_SCOPE`, `GLOBAL_SPEC`, `ASSUMPTIONS` and `TBD-ACCOUNT-001` synchronized. | `MVP-019/020`, `POST-MVP-010`, `SCOPE-007/010/015/017/041`. |
| Architecture metadata referenced `GLOBAL_SPEC` 0.4.0. | Navigation/staleness | Updated to 0.6.0. | `ARCHITECTURE` metadata. |
| Spec metadata used generic `BLOCKED_BY_TBD`, which could falsely block Foundation despite defined safe boundaries. | Gate ambiguity | Reclassified precisely: ready for Foundation; named later feature activation remains blocked. | Critical spec metadata and P0 triage. |
| Initial standard-scene/profile coverage was an unregistered prose gap. | Traceability gap | Added `TBD-PREVIEW-001` P1 with owner, impact and closure gate. | `OPEN_QUESTIONS`, standard preview spec, ADR-0004. |
| ADR-0002/0004/0006 contained resolved or nonexistent TBD/requirement ranges. | Broken traceability | Replaced with existing exact IDs/ranges. | ID/reference scan. |

No document was expanded merely to repeat the 15 audit dimensions. Existing sections already covered them; only the gaps above changed canonical content.

## 5. Remaining blockers by implementation moment

- **Before Foundation:** none among classified P0; ADR-0007–0010 and explicit owner authorization were completed through QG-147/148 on 2026-08-02.
- **Before catalog pilot:** authorized AMIGO transport/file, pilot inventory/mapping and activation ownership.
- **Before numeric configurator/pricing:** exact compatibility, dimensions, price rules/version/source fixtures remain; tolerance, approver and per-item 1500-ruble scope are resolved but not implemented in Phase 1A.
- **Before public PII/account/admin:** legal/privacy/retention, identity/recovery and named operational roles.
- **Before AI pilot:** provider/data-processing/legal/TTL/evaluation/upload/cost gates.
- **Before production release:** provider regions, regional network evidence, backup/PITR/restore targets, monitoring and legal launch review.

## 6. Audit acceptance

- **AUDIT-0C-001 — PASS:** all 14 critical documents inspected against all 15 dimensions.
- **AUDIT-0C-002 — PASS:** all discovered direct contradictions corrected in canonical sources.
- **AUDIT-0C-003 — PASS:** no critical document remains `BLOCKED`, `NEEDS_EXPANSION` or `CONTRADICTORY` for Phase 1A entry review.
- **AUDIT-0C-004 — PASS:** feature-specific unknowns remain visible and fail closed.
- **AUDIT-0C-005 — PASS:** no application, import, media ingestion, SQL or production configuration created.

## 7. История

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Audited 14 critical documents, recorded targeted corrections and established zero-blocked Foundation result. |
| 1.1.0 | 2026-08-02 | Post-audit disposition recorded: QG-147/148 closed and owner-decision P0 resolved without opening Phase 1B features. |
