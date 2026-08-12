# Information architecture PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.2 public catalog route hierarchy refined; later destinations remain gated |
| Версия | 0.2.0 |
| Дата | 2026-08-03 |
| Product flows | [USER_FLOWS.md](../01-product/USER_FLOWS.md) |
| Screen detail | [SCREEN_SPECS.md](SCREEN_SPECS.md) |

## 1. Назначение and boundaries

IA makes catalog discovery, configuration, visualization and local contact understandable to non-technical users while supporting dynamic AMIGO categories and deep links. It defines destinations, hierarchy, navigation and content priority, not framework/routing implementation or final copy.

## 2. Principles

- **IA-SPEC-001 — MUST:** one primary customer task per page and one visually primary CTA; secondary actions remain available but subordinate.
- **IA-SPEC-002 — MUST:** catalog taxonomy is data-driven and can expose new approved categories without hardcoded top-level page creation.
- **IA-SPEC-003 — MUST:** current location, selected family/system and back path remain visible/predictable; back restores filters, scroll and draft.
- **IA-SPEC-004 — MUST:** catalog, configurator, standard preview, AI visualizer, cart and contact are distinct concepts with explicit transitions.
- **IA-SPEC-005 — MUST:** AI photo upload is never required to calculate or contact; standard preview appears first as lower-friction route.
- **IA-SPEC-006 — MUST:** URLs/deep links expose only public slugs or opaque authorized references, never storage URLs/tokens/PII.
- **IA-SPEC-007 — MUST:** unavailable destination explains readiness/manual route rather than disappearing without context.
- **IA-SPEC-008 — MUST:** partner, local services, preliminary price and installment claims use approved content/version.
- **IA-SPEC-009 — MUST:** mobile navigation has no more than five top-level items/targets and does not mix drawer/tab/bottom patterns at one hierarchy.
- **IA-SPEC-010 — MUST:** account/admin routes are clearly separate from public commerce navigation and require authorization.
- **IA-SPEC-011 — MUST:** route change moves accessibility focus to meaningful page heading/main region and preserves intentional task state.
- **IA-SPEC-012 — MUST:** all dynamic/filter/visual surfaces have loading, empty, error, offline/degraded and unauthorized states.
- **IA-SPEC-013 — MUST:** during Phase 1B.2 an approved category subtree is a shareable `/catalog` query state and an approved material uses canonical `/catalog/{materialSlug}` detail. The slug is a public alias rather than authority; missing/retired aliases recover to the catalog, and future family/system routes MUST be introduced without silently changing an existing material-link meaning.

## 3. Public sitemap

| Destination | Purpose | Primary CTA | Key child/state |
|---|---|---|---|
| `/` | Value, partner trust, category entry, local services | `Подобрать жалюзи` | Starfield skip → hero → categories → how it works → portfolio/examples → service/contact |
| `/catalog` | Browse/search/filter dynamic active assortment | `Открыть материал` in Phase 1B.2 | Category hierarchy/query, readiness, sort/cursor, zero results |
| `/catalog?category={categorySlug}` | Shareable approved category subtree | `Открыть материал` | Breadcrumb/current category, descendant results, filters |
| `/catalog/{materialSlug}` | Active material variant detail | `Вернуться к категории` / copy link | Local media, article, safe facts, price/availability/version, not-found |
| `/catalog/families/{family}` | Future family overview after its feature gate | `Выбрать систему` | Materials/examples/help; not implemented in Phase 1B.2 |
| `/catalog/families/{family}/{system}` | Future system/model detail after its feature gate | `Настроить изделие` | Compatibility/readiness/price status; not implemented in Phase 1B.2 |
| `/materials` | Cross-catalog material discovery where useful | `Использовать в конфигурации` | Search, facets, variant detail |
| `/configurator/{draftRef?}` | Step-by-step configuration | `Рассчитать` / next step | Validation/manual review/price status |
| `/preview/{projectRef?}` | Standard demonstration interior | `Добавить в проект` | Scene/product controls/export |
| `/visualizer/{projectRef?}` | Private client-photo flow | `Загрузить фото` then `Сохранить результат` | Notice/upload/correction/base/refine/delete |
| `/cart` | Multi-window project summary | `Запросить замер` | Edit/duplicate/remove/stale states |
| `/request` | Contact/measurement/consultation handoff | `Открыть WhatsApp` / submit | Purpose/contact/summary/confirmation |
| `/portfolio` | Local verified work only | `Обсудить похожий проект` | Project detail |
| `/examples/amigo` | Clearly labelled partner examples | `Подобрать изделие` | Source/product mapping |
| `/services` | Region/free services/lead/warranty/installment neutral | `Запросить замер` | Measurement/delivery/install/FAQ |
| `/about` | Local business and partner status | `Связаться` | Badge/text fallback/evidence-safe content |
| `/help` | Measurement/configurator/visualizer guidance | Contextual CTA | FAQ/guides/errors |
| `/contact` | Confirmed WhatsApp and contact options | `Написать` | Hours/SLA only after confirmation |
| `/legal/{document}` | Privacy/terms/consent/legal content | Context-specific | Version/effective date |

Routes are conceptual and may be refined by technical architecture; canonical URLs and redirects must remain versioned and SEO-safe.

## 4. Account and staff sitemap

| Area | Destinations | Visibility |
|---|---|---|
| Account | `/account`, `/account/projects`, `/account/requests`, `/account/profile/privacy` | Authenticated owner resources only |
| Project | `/project/{opaqueRef}` | Guest token or account ownership |
| Visualization | `/project/{ref}/visualizations/{revision}` | Private owner-scoped |
| Admin overview | `/admin` | Staff capability |
| Catalog/source | `/admin/catalog`, `/admin/sources`, `/admin/sync` | Catalog/sync scopes |
| Pricing | `/admin/pricing` and version detail/diff | Price scopes |
| Media/content | `/admin/media`, `/admin/content` | Content/rights scopes |
| Leads/orders | `/admin/leads`, `/admin/orders`, `/admin/warranty` | Assignment/scope |
| Accounts/roles | `/admin/access` | Identity admin/owner |
| Audit/health | `/admin/audit`, `/admin/health` | Read scopes |

Admin deep links return neutral denied/not-found; navigation visibility is convenience, not authorization.

## 5. Primary navigation model

Desktop public header:

1. Logo/home.
2. `Каталог` (primary discovery).
3. `Как это работает` or `Визуализация`.
4. `Наши работы`.
5. `Услуги`.
6. Contact/WhatsApp as high-contrast action; cart/account utility icons with labels/tooltips.

Mobile uses concise header plus menu or an approved adaptive pattern. A sticky bottom CTA MAY show current primary task (`Подобрать`, `Продолжить`, `Корзина`, `Запросить замер`) with safe-area inset; it cannot cover content or conflict with system gestures. Product subflows use step header/back/progress, not top-level navigation replacement.

## 6. Catalog hierarchy and discoverability

Customer sees human category labels, images and short purpose; source system/model hierarchy appears progressively. Dynamic category records drive navigation. Breadcrumbs are required at three+ levels. Search covers family/system/model/material/article aliases with accessible suggestions and recent queries only under approved privacy policy.

Filters are URL/state-shareable where public and non-sensitive. Mobile filters use explicit sheet/dialog with count/apply/clear; desktop uses sidebar/toolbar. Back restores query, filters, sort, scroll and focus.

## 7. Task pathways

| Intent | Shortest path | Safe fallback |
|---|---|---|
| Не знаю тип | Home/category guide → catalog filters → system | Manager consultation |
| Знаю систему | Search/deep link → configurator | Inquiry if not ready |
| Хочу цену | Configurator → validated quote | `Цена уточняется` + handoff |
| Хочу посмотреть | Standard preview from config | Static product/material summary |
| Хочу на своём окне | Base config → private AI visualizer | Manual geometry/standard preview |
| Несколько окон | Cart/project → duplicate/edit items | Manager summary |
| Нужен замер | Any relevant page → request/WhatsApp | Confirmed contact reference |
| Рассрочка | Neutral CTA → manager inquiry | No automated terms |
| Вернуться | Account project/history or valid guest ref | Recovery policy |

## 8. Content hierarchy and trust

Above fold: value, local region/service, primary task and truthful partner signal. Trust proof follows with official partner context, verified local portfolio (separate from AMIGO examples), transparent preliminary-price language, free services/lead/warranty and privacy of photos. Legal/technical detail uses progressive disclosure, never hidden from decision-critical context.

Contact info remains easy to find; do not bury it behind animation. Partner badge absence uses text fallback. No ratings/testimonials/counts are invented.

## 9. Page states and error IA

Every destination defines:

- initial skeleton/reserved layout and progress after 300ms-class perceived wait;
- useful empty state with cause/next action;
- field/content error with recovery;
- dependency outage with last-known/manual path;
- access denied/expired without existence leak;
- stale/version conflict with compare/reload;
- deleted/retired content tombstone/alternative;
- offline/save-data behavior where useful.

Generic dead-end `404/Что-то пошло не так` is insufficient when a safe catalog/contact recovery exists.

## 10. Responsive, accessibility, security and analytics

IA must work at 320px minimum support decision, 375px validation baseline, zoom 400%, landscape and large screens; exact breakpoints are in `RESPONSIVE_SPEC`. Visible labels, sequential headings, skip link, landmarks, current-page state and focus restoration are required. Sensitive project/account routes use opaque refs and no index/cache; public catalog routes are canonical/indexable only when content ready.

Analytics records page/task/funnel states, searches and zero results using non-sensitive IDs. URL/referrer must not carry tokens/contact/photo data. Route performance and errors are measured separately for public, configurator, preview and admin.

## 11. Acceptance criteria and tests

Primary: `AC-AMIGO-PARITY-001`, `AC-CONFIG-001`, `AC-WHATSAPP-001`, `AC-AUTH-001`, `AC-ACCESS-001`, `AC-PERF-001`.

Tests: every sitemap destination and CTA; deep link/back/state restore; dynamic category; filters mobile/desktop; empty/error/outage/expired; no private token in URL/referrer; current location/breadcrumb; keyboard/focus/landmarks/zoom; contact visibility; partner/local example separation; SEO canonical/robots for public/private.

## 12. Dependencies, risks, TBD and history

Dependencies: all product/domain specs, screen/responsive/accessibility/content/SEO and routing/API. Open: final brand/navigation labels, legal pages, contact hours/SLA, auth route, exact public categories/readiness and language/localization expansion. Risks: overwhelming dynamic taxonomy, visualizer confusion, buried contact, mixed top-level patterns, private deep-link leakage and dead-end blocked states.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Созданы public/account/admin sitemaps, adaptive navigation, task paths, state/error IA and trust hierarchy. |
| 0.2.0 | 2026-08-03 | Refined Phase 1B.2 catalog IA to shareable category-query states and canonical material detail links while namespacing still-gated future family/system routes. |
