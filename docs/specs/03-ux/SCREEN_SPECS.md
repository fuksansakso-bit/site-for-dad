# Screen specifications PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.2 full catalog/admin screens implemented within the authorized slice; later screens remain gated |
| Версия | 0.3.0 |
| Дата | 2026-08-03 |
| IA | [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) |
| Design/responsive/a11y | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [RESPONSIVE_SPEC.md](RESPONSIVE_SPEC.md), [ACCESSIBILITY_SPEC.md](ACCESSIBILITY_SPEC.md) |

## 1. Shared screen contract

Every screen declares identity/H1, purpose, primary CTA, secondary actions, data/version/status, loading/empty/error/degraded/unauthorized states, responsive priority, focus/announcement, analytics and privacy/security. Unknown data is labelled; no screen invents price/availability/technical/legal values.

- **SCREEN-SPEC-001 — MUST:** one semantic H1/main landmark and predictable title/breadcrumb/current-nav context.
- **SCREEN-SPEC-002 — MUST:** only one primary visual CTA per task state; its enabled/disabled/loading/success/error semantics are explicit.
- **SCREEN-SPEC-003 — MUST:** async content reserves layout, names progress/recovery and preserves user input.
- **SCREEN-SPEC-004 — MUST:** blocked/manual states offer safe next action rather than dead end.
- **SCREEN-SPEC-005 — MUST:** private/project/admin screens are non-indexable/non-cacheable as policy and never expose sensitive refs in title/URL/analytics.
- **SCREEN-SPEC-006 — MUST:** route entry/back/validation/dialog closure manage focus consistently.
- **SCREEN-SPEC-007 — MUST:** all visual status has text/icon/semantic state, not color alone.
- **SCREEN-SPEC-008 — MUST:** destructive action is separated, names exact target/impact and supports recovery where possible.

## 2. Public screen inventory

| ID / screen | Purpose / primary CTA | Required regions | Critical states |
|---|---|---|---|
| `S-HOME` | Explain value and start selection / `Подобрать жалюзи` | Skip/starfield, hero, partner trust, categories, how-it-works, standard+AI preview distinction, verified portfolio/examples, free services, contact | Returning/reduced/degraded intro; badge text fallback; no invented testimonials |
| `S-CATALOG` | Browse dynamic categories / `Открыть материал` in Phase 1B.2; configurator CTA remains gated | Search, hierarchy, active-version state, filters/sort, material cards/detail | Loading, zero search/filter, invalid/stale link, category inquiry-only, local dependency unavailable |
| `S-FAMILY` | Understand family/systems / `Выбрать систему` | Breadcrumb, description, systems/models, materials/examples, compatibility/readiness, FAQ | No local-ready system; mixed price/availability; retired alias |
| `S-SYSTEM` | Evaluate specific system / `Настроить изделие` | Exact source/local identity, product media, options/constraints where verified, preliminary price state, service CTA | Missing limits/price/assets; inquiry-only; no fake compatibility |
| `S-MATERIALS` | Find material / `Использовать в конфигурации` | Search, facets/count, swatches, article/properties, selected configuration context | Unknown property, no compatible result, blocked asset, dynamic price category |
| `S-SERVICES` | Explain local process / `Запросить бесплатный замер` | Region, free measure/delivery/install, 2–7 calendar days, 12-month warranty, neutral installment, how order works | Operational/legal detail TBD visibly routes manager |
| `S-PORTFOLIO` | Show verified local work / `Обсудить проект` | Local-only project cards, facts/media provenance-safe labels | Empty initial portfolio; no partner example mixing |
| `S-PARTNER-EXAMPLES` | Show AMIGO examples / `Подобрать изделие` | Clear source label/partner context, exact product mapping where known | Rights/mapping blocked; never `Наши работы` |
| `S-ABOUT` | Establish local/partner trust / `Связаться` | Business story, partner statement/badge/text fallback, region/services | Name/legal requisites TBD; truthful minimum content |
| `S-CONTACT` | Provide confirmed contact / `Открыть WhatsApp` | Confirmed number, purpose choices, hours/SLA only if approved, privacy note | Deep-link unavailable; copyable number/reference |
| `S-HELP` | Reduce configuration/measurement errors / contextual CTA | Search/topics, diagrams with rights, warnings, contact | Unknown technical answer links manager/TBD |

The Phase 1B.2 `/catalog` implementation combines the active full `S-CATALOG`/`S-MATERIALS` surface: semantic server-rendered H1/main, active-version label, result count, dynamic category hierarchy, shareable search, category/system/color/availability/property filters, allowlisted sort, opaque next cursor, approved local images, article, source/local-override price status and textual availability. `/catalog/{materialSlug}` adds canonical material detail, active category breadcrumbs, exact local media, safe facts, version notice and copy-current-link action. Both routes provide explicit not-activated, zero-result, invalid/stale-link, not-found, loading, unexpected-error and dependency-unavailable states, remain useful without client JavaScript apart from copy-to-clipboard enhancement, and have no configurator/order CTA.

- **SCREEN-SPEC-009 — MUST:** the Phase 1B.2 catalog list keeps its full dynamic hierarchy, current category, query, filters and sort visible or recoverable in the URL, names active-version/readiness and price meaning in text, and provides a stable next-page link without document-level horizontal overflow at the supported narrow width.
- **SCREEN-SPEC-010 — MUST:** a Phase 1B.2 material detail shows one H1, category breadcrumbs, approved local image, material/color/article, safe system/property/availability/price facts, active-version context, return-to-category and share-current-URL action. Missing, retired, invalid or dependency-failed material states do not expose AMIGO/storage internals and always offer catalog recovery.

## 3. Configurator screens

### S-CONFIG

Header shows product/system, step progress, draft save and back. Main region contains one active field group with persistent labels/help/errors. Preview/summary is secondary on compact, persistent beside form on expanded. Footer/action area exposes Back/Next or Calculate and never covers errors.

Required step states:

1. family/system/model selection;
2. mounting;
3. width/height/quantity with unit and measurement help;
4. material search/filter/select;
5. hardware color/control/frame/chain/options by schema;
6. compatibility/validation review;
7. preliminary price/breakdown or unavailable/manual state;
8. standard preview/cart/AI next actions.

Changing upstream selection shows impact before clearing dependent choices. Errors use summary + inline + focus. Manual review preserves draft and offers measurement/contact.

### S-STANDARD-PREVIEW

Contains deterministic scene/canvas, exact product/material summary, family-supported controls, illustrative disclosure, loading/error/unsupported fallback, textual equivalent, export and add-to-project. Standard preview is labelled as not the client's window and has a clear optional transition to personal visualization.

### S-AI-NOTICE-UPLOAD

Before upload: purpose, what is processed/shared, retention/delete, no-training statement and alternatives; primary `Выбрать фото`, secondary `Продолжить без фото`. Upload zone also has file input/button; no drag-only requirement. Validation progress and errors specify format/quality recovery without logging/displaying unsafe metadata.

### S-AI-WINDOW-SELECT

Shows private image with candidate overlays and an accessible candidate list. User selects target, can retry/manual edit. Low confidence is explicit. Multiple windows/sashes are named/numbered without color-only distinction.

### S-AI-GEOMETRY-EDITOR

Canvas/editor has at least four large handles, visible zoom/pan/edit modes, undo/reset, per-point keyboard/numeric controls, sash/occlusion controls where supported, instructions and primary `Подтвердить окно`. Touch gestures have buttons; focus is never trapped in canvas.

### S-AI-RESULT

Before/base/refined tabs or comparison, exact product/material summary, base vs AI-refined label, protected disclosure, supported position controls, retry/correct, attach/share-safe and delete. Provider failure keeps base; delete names graph and revokes immediately.

## 4. Cart and handoff screens

### S-CART

Each item card: exact system/material/article, configuration revision summary, quantity, price status/amount/version, preview thumbnail/ref if permitted, warnings and edit/duplicate/remove. Mixed unavailable/stale status prevents misleading grand total. Summary shows included/excluded items and free services. Primary `Запросить замер`; secondary consultation/installment inquiry/save account.

Empty cart suggests catalog/contact. Expired guest state explains recovery without leak. Remove supports confirmation/undo where safe; edit preserves other items.

### S-REQUEST

Purpose selector (consultation/free measurement/installment inquiry), share-safe project summary, minimal contact fields, consent/notice, editable WhatsApp message preview, exact approved claims and primary `Открыть WhatsApp`/submit. Success distinguishes snapshot/lead accepted from external app opened. Deep-link failure shows copyable confirmed contact/reference.

### S-REQUEST-RECEIPT

Shows opaque reference, received state only if server accepted, next step without invented response SLA, safe project summary and return/account-save action. It does not display internal lead/order status.

## 5. Account screens

| Screen | Content/action | Special state |
|---|---|---|
| `S-AUTH` | Approved identity flow, visible labels, recovery and return path | Generic errors/no enumeration; provider outage guest path |
| `S-ACCOUNT-HOME` | Owned projects/requests, privacy controls | Empty; disabled/reauth |
| `S-PROJECT` | Configurations, historical/current quotes, previews, cart/handoff | Retired catalog/stale quote/deleted preview |
| `S-REQUESTS` | Customer-safe status/timestamps/actions | Internal notes excluded; cross-owner denied |
| `S-PROFILE-PRIVACY` | Contact preferences, sessions if approved, export/delete | Reauth and retention explanation |

## 6. Admin screens

| Screen | Primary task | Required data/states |
|---|---|---|
| `A-OVERVIEW` | Resolve P0 blocked/stale/pending | Completeness indicator; unknown ≠ zero; owner/action/evidence links |
| `A-SOURCES-PARTNER` | Review source/partner scope | 15 source records, permission version, badge/evidence, impact/revoke |
| `A-CATALOG-LIST/DETAIL` | Map and set independent readiness | Source vs local vs override, hierarchy/relations/assets/prices, diff/history |
| `A-MATERIALS` | Edit properties/mapping | Variant/article/source category/assets/compatibility, unknown semantics |
| `A-PRICING` | Stage/validate/approve/activate/rollback | Version/effective/context/diff/parity/approvals; no formula secrets in export |
| `A-MEDIA` | Register/map/publish/revoke/delete | Original/derivatives/usages/rights/publication/attribution/impact |
| `A-CONTENT` | Draft/review/publish/retire | Claims/evidence/assets/a11y/SEO/version/schedule |
| `A-SYNC` | Inspect run/diff/conflicts and approve/rollback | Capture/stages/severity/conflicts/active pointers/health |
| `A-LEADS-ORDERS` | Process assigned queue and transitions | Minimal PII, project/quote refs, allowed states, reason/evidence/outbox |
| `A-ACCESS` | Grant/revoke explicit staff capabilities | Scope/effective/separation/sessions/audit |
| `A-AUDIT` | Read immutable evidence | Filter/redaction/export/retention, no edit |
| `A-HEALTH` | Diagnose dependencies/jobs | Status/freshness/backlog/runbook/correlation, no secret payload |

Admin lists have loading/empty/filter zero/error/stale index/permission denied and large-diff states. Mutations always fetch authoritative detail/version before commit.

## 7. Modal, sheet and notification patterns

Use page for primary multi-step flows; modal/sheet only focused secondary actions. Dialog has labelled title/description, initial meaningful focus, trap, Escape/cancel, focus return and unsaved confirmation. Destructive confirmation states exact target/consequence. Toast is for transient confirmation and does not steal focus; critical/required action uses persistent banner/inline status. Loading buttons cannot be double-submitted.

## 8. Data, errors, privacy and performance

Screens display only fields allowed by role/surface. Public views exclude source credentials/admin notes/private refs. Client private photos use authorized short-lived delivery and no public cache. Catalog/configuration shell loads before heavy previews. Skeletons reserve size; image dimensions prevent CLS. Errors use stable user messages/recovery/correlation reference without sensitive detail.

## 9. Analytics

Each screen defines `screen_view`, primary-task state transitions, validation/recovery and success/failure using screen IDs and safe entity/version keys. No raw search/contact/comment, photo coordinates/URLs, auth token or admin field contents. A/B tests require owner/privacy/accessibility review and cannot alter legal/price claims silently.

## 10. Acceptance criteria and tests

All critical AC apply by surface: `AC-AMIGO-PARITY-001`, `AC-CONFIG-001`, `AC-PRICE-001`, `AC-STANDARD-PREVIEW-001`, `AC-AI-VIS-001`, `AC-CART-001`, `AC-WHATSAPP-001`, `AC-AUTH-001`, `AC-ADMIN-001`, `AC-ACCESS-001`, `AC-PERF-001`, `AC-PRIV-001`.

Tests: each screen at responsive bands and every loading/empty/error/degraded/unauthorized/stale/success state; primary CTA hierarchy; back/focus/scroll; long/unknown content; preliminary/status labels; no private data; keyboard/screen reader/zoom/reduced motion; visual regression; slow/offline dependencies and double submit.

## 11. Dependencies, risks, TBD and history

Dependencies: IA/design/motion/responsive/accessibility, product/domain specs, content and APIs. Open: final copy, legal/account screens after ADR, exact admin workflow labels, screen prioritization after usability study and final category inventory. Risks: screen proliferation, primary CTA conflict, tiny mobile canvas, hidden blocked state, admin data overload and leakage through URL/thumbnail/error.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены shared screen contract, 20+ public/task/account/admin surfaces, required regions/states and privacy/performance behavior. |
| 0.2.0 | 2026-08-03 | Recorded the implemented Phase 1B.1 server-rendered `/catalog` pilot, populated facets, version/readiness labels and empty/error/responsive boundaries without later-phase CTAs. |
| 0.3.0 | 2026-08-03 | Recorded the Phase 1B.2 full public hierarchy, shareable server filters/sort/cursor, material detail/breadcrumb/local media/share action and explicit loading/empty/not-found/degraded states without configurator or order scope. |
