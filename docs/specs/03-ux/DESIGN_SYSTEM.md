# Design system specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — initial premium interior-tech tokens/patterns; visual prototype review pending |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Design direction | Premium, modern, warm, readable, photo-led, mobile-first, not AMIGO turquoise-white |
| Motion | [MOTION_ANIMATION_SPEC.md](MOTION_ANIMATION_SPEC.md) |
| Accessibility | [ACCESSIBILITY_SPEC.md](ACCESSIBILITY_SPEC.md) |

## 1. Design principles

- **DS-SPEC-001 — MUST:** visual language is independent from AMIGO and uses graphite/warm-white/ivory/wood/soft-gold plus one restrained action accent.
- **DS-SPEC-002 — MUST:** product/material photography and configuration clarity dominate decoration; effects never obscure texture/color/state.
- **DS-SPEC-003 — MUST:** one primary action per screen; secondary/destructive actions have stable visual hierarchy.
- **DS-SPEC-004 — MUST:** all color, typography, spacing, radius, elevation, motion, icon and z-layer values use semantic tokens, not ad hoc per-screen values.
- **DS-SPEC-005 — MUST:** normal text contrast is at least 4.5:1, large text/non-text controls at least 3:1; focus and status are never color-only.
- **DS-SPEC-006 — MUST:** body text is at least 16px equivalent on mobile, supports zoom/reflow and readable line length.
- **DS-SPEC-007 — MUST:** interactive target is at least 44×44 CSS px with at least 8px separation where adjacent; hover is never the only affordance.
- **DS-SPEC-008 — MUST:** official partner logos/badge use correct approved assets/proportions/clear space; emojis are not structural icons.
- **DS-SPEC-009 — MUST:** component states include default/hover/pressed/focus/selected/disabled/loading/success/warning/error with semantic behavior.
- **DS-SPEC-010 — MUST:** main product UI remains calm and fast after the short starfield entry; no page becomes an unrelated effects showcase.
- **DS-SPEC-011 — MUST:** touch/keyboard/screen-reader equivalents exist for drag, canvas and icon-only controls.
- **DS-SPEC-012 — MUST:** dark starfield/hero and warm light commerce surfaces are explicitly paired; full dark mode is not implied until separately approved/tested.

## 2. Color tokens

Initial token baseline selected from owner direction and accessibility review:

| Semantic token | Baseline | Use |
|---|---|---|
| `color-graphite-900` / primary | `#1C1917` | Header, primary dark surfaces, text/action |
| `color-graphite-700` / secondary | `#44403C` | Secondary dark surface/text where contrast passes |
| `color-warm-white` / background | `#FAFAF9` | Main page background |
| `color-ivory` / muted surface | `#F5F0E6` | Section/card grouping, not low-contrast text |
| `color-wood` | `#7A5236` | Material/warm supporting accent |
| `color-soft-gold` | `#A16207` | Partner/trust highlight, selected detail; white text contrast validated |
| `color-action` | `#7C2D3E` | Single additional action accent (deep wine), not AMIGO turquoise |
| `color-on-dark` | `#FFFFFF` | Text/icons on graphite/action/gold when pair passes |
| `color-foreground` | `#0C0A09` | Body text on warm backgrounds |
| `color-border` | `#D6D3D1` | Dividers/inputs with non-color state supplement |
| `color-danger` | `#B91C1C` | Destructive/error with icon/text |
| `color-warning` | `#92400E` | Warning with label/icon |
| `color-success` | `#166534` | Success with label/icon |
| `color-info` | `#1E40AF` | Informational status, not primary brand |

Verified representative contrast pairs: white/action ≈ 9.1:1; white/soft-gold ≈ 4.9:1; graphite/warm-white ≈ 16.7:1; wood/warm-white ≈ 6.5:1. Final tokens require automated contrast checks across every state/theme; soft gold is not used as small text on light surfaces.

## 3. Typography

Initial pairing: `Playfair Display` for restrained large display/headings and `Inter` for body/UI, subject to Cyrillic coverage, font licensing/self-hosting/privacy/performance review. System serif/sans fallbacks must reserve comparable metrics; `font-display: swap/optional` equivalent prevents invisible text.

| Role | Size/line-height baseline | Weight | Rule |
|---|---|---|---|
| Display | fluid 40–72 / 1.05–1.15 | 500–600 | Short hero only; wraps cleanly |
| H1 | fluid 32–52 / 1.1–1.2 | 500–600 | One semantic H1 per page |
| H2 | fluid 26–40 / 1.2 | 500–600 | Clear section rhythm |
| H3 | 22–28 / 1.25 | 600 | Card/group headings |
| Body large | 18–20 / 1.5 | 400 | Lead/important explanation |
| Body | 16–18 / 1.5–1.7 | 400 | Default; 60–75 chars desktop |
| Label | 14–16 / 1.3–1.5 | 500–600 | Never sole substitute for form label |
| Caption | 13–14 / 1.4 | 400 | Secondary only with 4.5:1 contrast |
| Price/data | 16+ tabular figures | 500–700 | Locale/currency and status clear |

No body text below 13px. Uppercase/letter-spacing is limited to short labels. Truncation requires expansion/tooltip where full value matters; wrapping is preferred.

## 4. Spacing, layout, shape and elevation

Spacing scale uses 4px base: `0, 4, 8, 12, 16, 24, 32, 48, 64, 96`. Components use 8/12/16/24; sections 32/48/64/96 adapt responsively. Content max-width and gutters are responsive; long text remains readable.

Radius tokens: 0, 6, 10, 16, 24 and pill only for chips/status; no random mix. Photography/cards favor 16/24; inputs/buttons 10/12. Elevation is restrained: `none`, `raised`, `overlay`, `modal`; borders/contrast define most surfaces. Blur is reserved for modal backdrop or starfield atmospheric layers, not routine cards.

Z layers: base, sticky, dropdown, overlay, modal, toast; no arbitrary large numbers. Fixed bars reserve content/safe-area space.

## 5. Icons and imagery

One consistent SVG outline family with 1.5–2px stroke and token sizes 16/20/24/32. Icon-only controls require visible tooltip and accessible label; nav combines icon + text. Status icons supplement labels/color. Official brand assets are never redrawn/recolored/cropped beyond brand rules.

Photography priorities:

- true material/product identity and approved provenance;
- reserved aspect ratio/size to prevent layout shift;
- responsive AVIF/WebP derivatives when rights/pipeline allow, original retained privately/managed;
- descriptive alt for informative images; decorative images empty alt;
- partner examples vs local work labels remain adjacent/clear;
- screen color variation disclaimer near material selection/preview where relevant.

## 6. Component inventory

| Component | Required behavior/states |
|---|---|
| Header/navigation | Current state, skip link, cart/account/contact, responsive menu, no hidden contact |
| Button/link | Primary/secondary/tertiary/destructive; loading prevents duplicate; focus visible |
| Product/category card | Image, title, readiness/price status, one CTA; full-card link semantics without nested traps |
| Material swatch/card | Exact asset/name/article/properties/selected/unavailable; image not color-only |
| Search/filter/chip | Label, clear, result count, URL/state restore, keyboard and mobile sheet |
| Stepper | Current/complete/error labels; back and non-linear rules; no progress by color alone |
| Field/fieldset | Persistent label/helper/required, inline+summary errors, semantic input/autofill |
| Price summary | Preliminary/status/version/freshness/breakdown; tabular figures; no fake zero |
| Preview canvas | Text summary, visible controls, keyboard alternative, loading/error/fallback |
| Photo editor | Large handles, zoom/pan separation, keyboard numeric/point controls, undo/reset |
| Cart item | Independent revision/quantity/price/preview states and edit/duplicate/remove |
| Status badge | Text + icon, semantic token; `unknown` distinct from success |
| Dialog/sheet | Focus trap/return, labelled title, escape/cancel, unsaved/destructive confirmation |
| Toast/banner | Accessible live region, persistent for critical info, does not steal focus |
| Data table/admin grid | Headers/sort/filter/pagination, responsive alternative, row actions and no color-only state |
| Empty/error/skeleton | Reserved dimensions, explanation and recovery; skeleton not mistaken for content |

## 7. Interaction and feedback

Press feedback appears promptly without shifting layout. Micro transitions generally 150–300ms and complex transitions ≤400ms, but motion spec/reduced-motion overrides. Async actions show immediate busy state and progress/skeleton when noticeable; submit buttons prevent duplicate while preserving idempotent retry. Errors state cause and remedy near field plus summary/focus for multiple errors. Success confirms result and next action; destructive action is separated and recoverable where practical.

## 8. Public vs admin density

Public surfaces are spacious, photo-led and progressive. Configurator balances visual preview with one active decision. Admin uses denser tables/filters but retains 44px touch targets at narrow layouts, readable typography and clear grouping; it does not inherit decorative starfield. Both share semantic tokens/components, with role-specific density tokens rather than separate visual brands.

## 9. Security, privacy, performance and analytics

UI never displays/logs private object URLs or secrets. Sensitive previews are visually marked private and have delete controls. Fonts/assets avoid third-party tracking unless approved. Image dimensions reserve layout; heavy media/renderers lazy-load; starfield cannot block catalog. Component analytics use semantic event IDs and no field/photo contents.

## 10. Acceptance criteria and tests

Primary: `AC-ACCESS-001`, `AC-PERF-001`, `AC-STANDARD-PREVIEW-001`, `AC-AI-VIS-001`, `AC-CART-001`, `AC-ADMIN-001`.

Tests: automated token contrast/state matrix; 375/768/1024/1440 plus 320/zoom/landscape; touch targets/spacing; keyboard/focus/screen reader; font fallback/CLS; no emoji structural icons; image aspect/lazy loading; light surfaces/dark hero; component visual regression; reduced motion; admin density; error/loading/empty/offline.

## 11. Dependencies, risks, TBD and history

Dependencies: IA/motion/screens/responsive/accessibility, content/media/performance. Open: final brand/name/logo, visual prototype validation, font licensing/self-hosting, final imagery/icon set, exact dark-mode scope and partner brand notes. Risks: gold contrast misuse, luxury serif hurts readability, starfield dominates task, excessive effects, wrong material photography and inconsistent admin/public tokens.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены owner-aligned premium palette, typography, tokens, component inventory, public/admin density and accessibility/performance rules. |
