# Accessibility specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — target and verification matrix defined |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Conformance target | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA, plus stricter product touch/interaction rules where specified |
| Pattern guidance | [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) used only when native semantics are insufficient |

## 1. Purpose and scope

Accessibility is a release requirement for public, configurator, preview, AI editor, account and admin tasks. The goal is functional equivalence across keyboard, screen reader, zoom/reflow, touch, reduced motion, contrast/high-contrast and common cognitive/motor needs—not a one-time automated score.

## 2. Нормативные requirements

- **A11Y-SPEC-001 — MUST:** semantic native HTML/controls are preferred; ARIA supplements rather than repairs incorrect semantics.
- **A11Y-SPEC-002 — MUST:** each page has language, unique title, skip link, landmarks, one meaningful H1 and logical headings/list/table relationships.
- **A11Y-SPEC-003 — MUST:** all functionality is keyboard operable without timing or gesture trap; focus order follows task/reading order.
- **A11Y-SPEC-004 — MUST:** focus indicator is visible, high-contrast and not removed; focused control is not obscured by sticky bars/overlays.
- **A11Y-SPEC-005 — MUST:** route/dialog/error/action moves focus predictably and returns focus to valid trigger/next context.
- **A11Y-SPEC-006 — MUST:** normal text contrast ≥4.5:1, large text/non-text interactive boundaries ≥3:1; disabled/decorative semantics handled correctly.
- **A11Y-SPEC-007 — MUST:** color, position, shape, motion or image alone never conveys status/selection/error/compatibility/price readiness.
- **A11Y-SPEC-008 — MUST:** product target size is at least 44×44 CSS px where practicable and never below applicable WCAG 2.2 target-size requirements/exceptions without documented equivalent spacing/alternative.
- **A11Y-SPEC-009 — MUST:** text reflows without loss/two-dimensional page scroll at 320 CSS px equivalent and supports 200% text/400% browser zoom as applicable.
- **A11Y-SPEC-010 — MUST:** users may zoom; orientation and text spacing overrides do not break content/function.
- **A11Y-SPEC-011 — MUST:** meaningful images have contextual alt; decorative images empty alt; material color/image also has exact text identity/article/properties.
- **A11Y-SPEC-012 — MUST:** every field has persistent programmatic label, instructions/units, required state and error relationship; placeholder is not label.
- **A11Y-SPEC-013 — MUST:** multiple form errors produce summary with links, inline cause/remedy, focus to summary/first invalid and screen-reader announcement without repeated noise.
- **A11Y-SPEC-014 — MUST:** dynamic price/status/cart/job changes use appropriate live-region/alert strategy and never announce every render frame/keystroke.
- **A11Y-SPEC-015 — MUST:** all drag/point/gesture operations have visible single-pointer and keyboard alternatives; geometry points can be selected/moved numerically or by keys.
- **A11Y-SPEC-016 — MUST:** canvas/visual preview has equivalent text summary, controls/state and non-canvas path; output imagery has meaningful description where needed.
- **A11Y-SPEC-017 — MUST:** starfield/animations respect reduced motion, allow immediate skip/pause where needed and contain no unsafe flashing.
- **A11Y-SPEC-018 — MUST:** timeouts/session/guest expiry warn and allow extension where permitted; no essential task depends on unnecessarily short time.
- **A11Y-SPEC-019 — MUST:** authentication does not require inaccessible cognitive test; CAPTCHA, if ever used, needs accessible alternatives and is not assumed.
- **A11Y-SPEC-020 — MUST:** status/error/help language is plain, specific and actionable; technical source terms are explained progressively.
- **A11Y-SPEC-021 — MUST:** dialogs/sheets/menus/tabs/comboboxes/grids follow native/APG keyboard/focus/name/state patterns and Escape/back behavior.
- **A11Y-SPEC-022 — MUST:** audio/video, if introduced, needs captions/transcripts/audio-description decisions; none is required for current core flow.
- **A11Y-SPEC-023 — MUST:** admin data has accessible table semantics or equivalent key-value/card view, sortable headers, captions and non-color status.
- **A11Y-SPEC-024 — MUST:** accessibility defects in critical funnel are severity/blocking issues with owner, requirement, reproduction and regression test.
- **A11Y-SPEC-025 — MUST:** no automated accessibility tool alone can mark release accessible; manual assistive-technology/task testing is required.

## 3. Keyboard and focus contract

Global order: skip → header/nav/utilities → main H1/task → contextual actions → footer, with task-specific logical grouping. Components:

- menu/combobox/listbox/tab/dialog/grid behavior follows native or APG pattern consistently;
- visible `Tab` reaches interactive controls only; arrows are used only within established composite widgets;
- `Enter/Space` activation semantics are standard; Escape closes dismissible overlay and returns focus;
- disabled is semantic and not focusable unless pattern requires discoverable unavailable explanation; read-only remains distinguishable;
- deleting/hiding focused item moves focus to logical next/previous/summary, never document start unexpectedly;
- route change focuses page H1/main after preserving browser back state; hash/error links focus/scroll target without sticky obstruction.

## 4. Forms and validation

Fieldsets/legends group dimensions, mounting, contact and options. Units (mm, quantity, currency) are in label/description, not visual suffix alone. Required/optional is text/semantic. Validation occurs after meaningful user action, not noisy on every keystroke. Numeric input allows typing/paste and appropriate mobile keyboard without preventing assistive input; server errors map to same fields/summary.

Price unavailable/manual review is not a disabled unexplained button: status, reason and contact/save action are readable. Loading button retains accessible name plus busy state and prevents duplicate.

## 5. Catalog and material accessibility

Category/material cards have one clear interactive structure, not nested links/buttons. Search suggestions expose count/active descendant; filter controls announce selection/result count and can clear. Color swatches include name/article and selected/unavailable state. Product media alt describes product/system/material purpose, not redundant keyword stuffing. Breadcrumb/current nav are programmatic.

## 6. Standard preview and AI editor

Standard preview provides text: scene, system/model, material/article, hardware/control and product position, plus controls usable without canvas. Visual changes update concise status on committed action.

AI flow:

- notice and `Продолжить без фото` before upload;
- file input/button alternative to drag-drop;
- candidate list pairs each overlay with text ID/confidence wording;
- point editor exposes target list, coordinates, arrow-key increments, reset/undo and instructions;
- zoom/pan/edit modes are explicit; no gesture conflict;
- before/base/refined comparison is controllable by tabs/toggle, not precision slider only;
- progress uses real stage text; errors/quality guidance are announced;
- delete is accessible and confirms exact scope.

## 7. Motion, sensory and cognitive considerations

Reduced motion bypasses starfield flight/parallax/large transforms and retains immediate hero. No autoplay sound. Avoid rapid flashing, infinite attention loops, scroll-jacking and motion tied to pointer without alternative. Maintain consistent navigation, terminology and component placement. Multi-step configurator shows progress/back and autosaves as approved. Instructions use examples/diagrams with text and do not rely on left/right/color only.

## 8. Responsive, touch and high contrast

Test touch targets/spacing/safe areas and virtual keyboard. At zoom/large text, content wraps; sticky bars never obscure focus/errors; dialogs remain scrollable with reachable controls. Forced-colors/high-contrast preserves borders, focus, selected/checked/status and canvas alternative. Pointer hover is enhancement only. Landscape is supported but not required.

## 9. Error, loading, empty and timeout states

Skeletons are hidden appropriately from assistive tech or labelled once; they do not announce dozens of placeholders. Spinners have accessible status only for meaningful wait. Empty state explains cause/action. Error identifies affected task and recovery; correlation ID is optional text. Offline/dependency outage retains manual/contact route. Session expiry warning receives focus/announcement and does not erase work unexpectedly.

## 10. Content, language and localization

Default language is Russian with correct `lang`; code-switching/terms may use language metadata where necessary. Avoid unexplained English jargon in customer UI. Links describe destination/action. Dates/times/amounts/units use locale and text labels. Error/success do not depend on punctuation/icon alone. Legal/privacy text remains readable and is not hidden in hover tooltip.

## 11. Security and privacy accessibility

Accessible labels/messages must not leak whether account/resource exists. Screen-reader-only content is subject to the same privacy review. Focus/live announcements never include tokens, full phone/address, private object URLs or image-derived sensitive text unnecessarily. Security controls cannot intentionally block password managers, paste, zoom or assistive tech without documented safer alternative.

## 12. Test matrix and evidence

| Layer | Required evidence |
|---|---|
| Automated | Semantic/lint rules, WCAG scans, color contrast, accessible names, common form/ARIA errors |
| Keyboard | All critical routes, overlays, editor, admin grids with visible/unobscured focus |
| Screen reader | At least representative Windows browser + screen reader and mobile platform pair selected in support matrix |
| Zoom/reflow | 200% text, 400% browser zoom, 320/375 widths, landscape, long Russian labels |
| Motion/contrast | Reduced motion, forced colors/high contrast, color-vision-independent states |
| Touch | 44px targets/spacing, virtual keyboard, drag alternatives, safe areas |
| Manual cognitive | Plain errors/instructions, progress/back/recovery, no surprise/time pressure |
| Regression | Component/unit, E2E critical funnel, visual/focus snapshots and documented assistive-tech run |

Exact browser/AT versions and user testing participants remain `TBD` in quality/support planning; release evidence records version/date/results/defects, not a timeless assertion.

## 13. Acceptance criteria and tests

Primary: `AC-ACCESS-001` plus every feature AC includes accessibility variants. Critical journey: skip intro → catalog/filter → configure/errors → price state → standard preview → optional upload/editor/result/delete → cart/handoff; account/admin representative flows.

Negative tests: focus hidden by sticky; keyboard trap; drag-only point; color-only status; empty alt for informative material; duplicate live announcements; inaccessible disabled state; zoom overflow; private data in accessible name; reduced-motion ignored; timeout loses draft.

## 14. Dependencies, risks, TBD and history

Dependencies: all UX/domain screens/components, design tokens, quality strategy and eventual browser/AT support matrix. Open: representative users/testing logistics, exact browser/AT versions, accessible geometry editor usability validation and legal compliance review beyond technical WCAG target. Risks: canvas-only visualization, admin grid complexity, luxury typography contrast/readability, motion sensitivity and automated-test false confidence.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Established WCAG 2.2 AA target, 25 requirements, critical component/visualizer/admin patterns and multi-layer verification. |
