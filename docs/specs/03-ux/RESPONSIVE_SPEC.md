# Responsive specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1F.1 critical public/admin mobile baseline authorized and in progress |
| Версия | 0.2.0 |
| Дата | 2026-08-12 |
| Screen behavior | [SCREEN_SPECS.md](SCREEN_SPECS.md) |
| Accessibility | [ACCESSIBILITY_SPEC.md](ACCESSIBILITY_SPEC.md) |

## 1. Purpose and principles

Responsive behavior preserves task priority, content, accessibility and performance across phone/tablet/desktop, orientation and zoom. It is not merely scaling a desktop composition.

- **RWD-SPEC-001 — MUST:** layout is mobile-first and reflows without horizontal page scroll at the approved minimum viewport and up to 400% zoom.
- **RWD-SPEC-002 — MUST:** viewport configuration permits pinch zoom; disabling zoom is prohibited.
- **RWD-SPEC-003 — MUST:** breakpoints respond to content needs and semantic layout tokens; validation includes 320, 375, 768, 1024 and 1440 CSS px.
- **RWD-SPEC-004 — MUST:** primary tasks/content stay present on mobile; secondary detail may collapse progressively but remains reachable.
- **RWD-SPEC-005 — MUST:** touch targets are at least 44×44 CSS px with adequate separation and safe-area insets.
- **RWD-SPEC-006 — MUST:** fixed/sticky headers/CTAs reserve space and never cover focused content, errors or system gesture areas.
- **RWD-SPEC-007 — MUST:** images/canvas reserve aspect ratio, use responsive derivatives and do not trigger layout shift.
- **RWD-SPEC-008 — MUST:** no capability depends on hover, precision pointer, drag-only or landscape-only operation.
- **RWD-SPEC-009 — MUST:** long labels, Cyrillic text, dynamic category names, price/status and 200–400% text expansion wrap without loss.
- **RWD-SPEC-010 — MUST:** orientation change preserves draft, filters, scroll/focus and visualization geometry coordinates.
- **RWD-SPEC-011 — MUST:** responsive alternatives have equivalent semantics/DOM state and server authorization.
- **RWD-SPEC-012 — MUST:** dense admin tables use responsive patterns without hiding critical fields/actions or relying on uncontrolled horizontal scroll.

## 2. Layout bands and validation

Breakpoints are initial design-system bands, not device detection:

| Band | Reference widths | Layout intent |
|---|---|---|
| Compact | 320–599 | One column, full-width controls, bottom/sticky contextual CTA, sheets for filters/summary |
| Medium | 600–899 | One/two columns where content permits; preview above/beside form |
| Expanded | 900–1199 | Catalog/sidebar, configurator two-pane, admin responsive grid |
| Wide | 1200+ | Bounded max-width, generous whitespace, three/four-column catalog, persistent summary |

Required validation also includes 375×667, 390×844, 768 portrait/landscape, 1024, 1280/1440, narrow split-screen, browser zoom 200/400%, large text and reduced motion. Exact minimum support/browser matrix remains technical TBD.

## 3. Global shell

Compact: logo, concise menu trigger, cart with text/accessible label, contact reachable; top-level menu not overcrowded. Contextual bottom CTA respects `env(safe-area-inset-bottom)` conceptually and disappears/changes by task state. Expanded: horizontal primary nav, contact CTA, utilities; content max-width maintains readable measure.

Starfield/hero uses dynamic viewport height carefully, never `100vh` that hides controls under mobile chrome. Skip/CTA stays in safe visible area. Hero text reflows; decorative layers crop safely and are removed/degraded on small/weak devices.

## 4. Catalog and material screens

Compact: 1–2 columns depending card content/min width; filters in labelled sheet with apply/count/clear; sort/search stable; chips horizontally wrap rather than force page overflow. Expanded: 3–4 columns and optional persistent filter sidebar. Card image ratio stable; title/status/CTA never truncate critical identity.

Material swatches require sufficient visual area plus name/article; do not make tiny color squares the sole control. Long facet lists are searchable/collapsible, keyboard and screen-reader compatible.

## 5. Configurator and preview

Compact prioritizes one step/form, selected-value summary and explicit next/back; preview is collapsible/above or separate step, not a tiny fixed pane. Sticky CTA does not hide fields/errors. Numeric keyboard, unit label and helper text are visible. Expanded uses two-pane form + sticky preview/summary with bounded independent behavior, avoiding nested scroll traps.

Standard preview aspect adapts without cropping product anchor; controls wrap/group and have visible labels. AI editor uses full available width, large point handles and separate zoom/pan/edit modes; keyboard/numeric correction remains. Landscape can enlarge canvas but never becomes required.

## 6. Cart, forms and account

Cart becomes stacked item cards on compact; quantity/edit/duplicate/remove remain distinct targets, price/warnings next to item. Totals/CTA sticky only with content inset. Expanded may use grid/table-like alignment but preserves semantic grouping.

Forms are one column compact, logically grouped medium/wide; labels/help/errors never rely on placeholders. Address/contact/WhatsApp fields use semantic input type/autofill. Error summary links/focus work in every layout. Account navigation adapts without mixing same-level bottom/sidebar patterns.

## 7. Admin responsive behavior

Wide uses sidebar + data grids. Medium collapses navigation and optional columns. Compact switches each row to labelled key-value card or controlled table scroll region with explicit affordance, sticky first/identity column only if accessible. Critical status, ID, impact and primary action stay visible; bulk selection/confirmation presents exact targets. No admin mutation is hidden behind swipe-only action.

## 8. Content and media

Use `srcset/sizes`-equivalent responsive selection, AVIF/WebP where approved, width/height/aspect ratio and lazy loading below fold. Hero/LCP image only eager when truly critical. Material fidelity uses sufficient derivative quality; low-bandwidth mode can offer lower resolution but must not substitute another asset. Fonts preload only critical variants and preserve metrics.

## 9. Edge cases and failures

- 320px + longest label/price/status/warning;
- OS/browser text size and 400% zoom;
- virtual keyboard hides sticky CTA/field;
- notch/safe areas/foldable/split screen;
- portrait ↔ landscape during configuration/photo edit;
- network image failure preserves card dimensions/text;
- menu/dialog/sheet focus and scroll lock;
- filter sheet close restores trigger and state;
- embedded maps/charts if future have text fallback;
- admin grid 50+ columns/large diff uses progressive detail/export, not unreadable compression;
- print/export layout for quote/preview where approved.

## 10. Performance, privacy, analytics and tests

Route/feature splitting and lazy media/renderer prevent desktop assets from penalizing compact devices. No client-hardware fingerprinting; coarse responsive/performance analytics only if approved. Private media never becomes public responsive URL. Layout shift, image choice, interaction latency and errors are measured by band without exact device identifiers.

AC: `AC-ACCESS-001`, `AC-PERF-001`, `AC-CONFIG-001`, `AC-AI-VIS-001`, `AC-CART-001`, `AC-ADMIN-001`.

Tests: listed widths/orientations/zoom/text; no page overflow; touch targets/safe areas; keyboard/focus; filter/nav/state persistence; configurator two→one pane; canvas point editing; sticky overlap/keyboard; admin table alternative; responsive images/CLS/save-data; visual regression in long/error/loading states.

## 11. Dependencies, risks, TBD and history

### 11.1. Phase 1F.1 critical mobile baseline

- **P1F1-RESP-001 — MUST:** `/`, `/catalog`, material detail, `/configure`, `/preview`, `/cart`, `/checkout`, public request summary, `/admin/login` and core admin routes pass at 320, 375, 390 and 430 CSS px without document-level horizontal overflow.
- **P1F1-RESP-002 — MUST:** public cards/images preserve declared aspect ratio and width bounds; configurator steps are touch-operable, selected state does not rely on hover and current result/primary CTA remains reachable.
- **P1F1-RESP-003 — MUST:** catalog/configurator filters use an accessible sheet/dialog on compact layouts with explicit open/apply/clear/close, focus management and no covered content.
- **P1F1-RESP-004 — MUST:** sticky actions account for safe-area and dynamic keyboard viewport, do not cover validation/result/last content and retain at least 44×44 px touch targets.
- **P1F1-RESP-005 — MUST:** admin data tables become meaningful cards or use one controlled labelled overflow container; whole-page horizontal scrolling is forbidden.
- **P1F1-RESP-006 — MUST:** loading, empty, no-result, error, retry and unauthorized states retain layout, readable action and keyboard/screen-reader semantics at compact width.

Dependencies: IA/design/motion/screens/accessibility/performance and all visual domain modules. Open: browser support/min width, exact container/breakpoint tokens after prototype, installable/PWA/offline scope, responsive image sizes and print/export. Risks: desktop compression, hidden critical info, sticky overlap, inaccessible horizontal table, tiny material/geometry controls and large media cost.

| Версия | Дата | Изменение |
|---|---|---|
| 0.2.0 | 2026-08-12 | Authorized the 320–430 px critical route baseline, touch/filter/sticky/form/table and state requirements. |
| 0.1.0 | 2026-08-02 | Определены content-driven bands, 320–1440/zoom validation, per-surface adaptive behavior, safe areas and admin alternatives. |
