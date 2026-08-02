# Motion and animation specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — motion language and starfield sequence defined |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Design system | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| Accessibility | [ACCESSIBILITY_SPEC.md](ACCESSIBILITY_SPEC.md) |

## 1. Назначение and boundaries

Motion explains hierarchy, state and spatial continuity while preserving speed, comfort and task control. The signature starfield is a short first-visit introduction, not a gate or recurring page effect. Vengeance UI is only an inspiration for isolated motion principles, never copied code/design.

## 2. Нормативные требования

- **MOTION-SPEC-001 — MUST:** every animation has documented purpose (`FEEDBACK`, `STATE`, `NAVIGATION`, `SPATIAL`, `ONBOARDING`) and an equivalent final state without motion.
- **MOTION-SPEC-002 — MUST:** user input is never blocked solely until an animation completes; animation is interruptible/cancellable.
- **MOTION-SPEC-003 — MUST:** `prefers-reduced-motion: reduce` or equivalent disables starfield flight, parallax, large transforms and nonessential loops and preserves immediate content.
- **MOTION-SPEC-004 — MUST:** primary UI motion uses shared duration/easing tokens; arbitrary per-component choreography is prohibited.
- **MOTION-SPEC-005 — MUST:** transform/opacity are preferred and layout-shifting width/height/top/left animations are prohibited unless measured and justified.
- **MOTION-SPEC-006 — MUST:** loading/progress reflects real state and cannot imply success before server/job confirmation.
- **MOTION-SPEC-007 — MUST:** animation does not change semantic/DOM/focus order or hide focused content.
- **MOTION-SPEC-008 — MUST:** hover motion has keyboard/touch state equivalent and no required information appears only on hover.
- **MOTION-SPEC-009 — MUST:** repeating/decorative motion can be paused/stopped where accessibility standards require; no flashing above safe thresholds.
- **MOTION-SPEC-010 — MUST:** starfield assets/work stay within performance budget and never delay catalog/hero accessibility.
- **MOTION-SPEC-011 — MUST:** weak-device/save-data/degraded mode uses static or minimal background automatically.
- **MOTION-SPEC-012 — MUST:** route/modal/list motion retains predictable direction and focus restoration.

## 3. Motion tokens

| Token | Baseline | Use |
|---|---:|---|
| `instant-feedback` | 80–120ms | Press/active visual response |
| `micro-enter` | 180–240ms ease-out | Tooltip/menu/chip/state entry |
| `micro-exit` | 120–180ms ease-in | Exit, shorter than entry |
| `standard` | 240–300ms emphasized ease | Accordion/dialog/content replacement |
| `complex-max` | ≤400ms | Large sheet/shared spatial transition |
| `starfield-total` | 2–3s | Confirmed signature first-visit sequence only |
| `stagger` | 30–50ms, bounded items | Small visible groups, not long lists |

Exact curves are semantic tokens and require browser/device prototype verification. Reduced motion sets nonessential durations near zero and replaces spatial moves with immediate/crossfade only if crossfade is comfortable.

## 4. Starfield sequence

### Normal first visit

| Phase | Target interval within 2–3s | Visual / interaction |
|---|---|---|
| Initial flight | 0–~1.2s | Sparse performant stars move toward viewer; welcome/skip and content shell available |
| Deceleration | ~1.0–1.8s | Motion eases, density/brightness restrained |
| Greeting | ~1.4–2.3s | Short greeting appears with readable contrast |
| Hero transition | ~2.0–3.0s | Crossfade/scale continuity into actual hero; main CTA receives no surprise focus |

`Пропустить` is visible/keyboard-accessible immediately, at least 44×44 target, labelled and activates instant hero without content loss. Intro does not replay on every page; replay policy uses non-sensitive local preference and offers manual replay only if useful.

### Reduced/degraded

- reduced motion: static dark star field or simple non-moving background, greeting/hero immediately;
- save-data/weak hardware/slow startup: static optimized artwork/gradient, no particle engine;
- JavaScript/render failure: server/static hero and catalog CTA remain visible;
- returning user: skip to hero according to approved preference/first-visit semantics;
- intro state never becomes auth/analytics identifier.

## 5. Component motion patterns

| Pattern | Purpose | Motion | Reduced alternative |
|---|---|---|---|
| Button press | Feedback | Color/opacity + tiny non-layout scale | Color/outline only |
| Dropdown/menu | Spatial/state | Short fade/translate from trigger | Immediate/fade |
| Dialog/sheet | Hierarchy | Fade + short scale/slide; focus trapped | Immediate with focus |
| Accordion/filter | State | Height via safe technique/content reveal; avoid jank | Immediate |
| Step change | Navigation | Directional shared container, progress updates | Immediate heading/focus |
| Validation | Feedback | No shake requirement; field/error appears | Same static error |
| Price update | State | Stable number crossfade, tabular width | Immediate; announce once |
| Material selection | Selection | Border/focus/check marker | Same without transform |
| Preview control | Cause/effect | Render updates without UI layout shift | Immediate frame update |
| AI progress | Real job state | Progress/skeleton, no fake percent | Text/status updates |
| Cart add | Cause/effect | Brief item/confirmation, no flying essential object | Accessible live confirmation |
| Toast | Feedback | Short fade; persistent critical banner | Immediate |
| Admin row update | State | Highlight bounded and labelled | Status text/live region |

## 6. Navigation and continuity

Forward nested navigation moves content in a consistent deeper direction; back reverses and restores scroll/focus. Route animation cannot delay URL/history update or break browser back. Shared material/product image transition is optional and disabled on weak/reduced mode. Modals are for focused secondary tasks, not primary page navigation.

## 7. Loading, progress and asynchronous work

Under ~300ms, use stable pressed/busy feedback without flashing skeleton. Longer catalog/content load reserves dimensions and uses low-motion skeleton. AI/sync/export use named stages and cancel/retry; fake determinate percentages are prohibited when progress is unknown. Completion is announced after authoritative state; duplicate submit is disabled/idempotent.

## 8. Validation, errors and edge cases

- skipped intro mid-phase immediately reveals stable hero and removes/cancels animation work;
- route change/tab hidden/background reduces/stops particle work;
- resize/orientation/zoom does not restart intro or reposition focused control;
- slow font/image load does not shift starfield/hero CTA;
- simultaneous price/preview updates debounce/coalesce without flicker;
- error/retry cannot loop attention-grabbing animation;
- long lists do not stagger every row; virtualized rows appear stable;
- focus outline remains visible during transforms/overlays;
- motion setting changes live where platform allows.

## 9. Security, privacy, performance and analytics

No third-party motion script/asset is loaded without security/privacy/performance review. Starfield is first-party and contains no tracking. Animation uses compositor-friendly bounded particles/frames and lazy execution; performance budgets measure CPU/GPU/energy/frame drops/CLS and hero interactivity. Analytics may record intro shown/skipped/completed/degraded and performance class without fingerprinting hardware.

## 10. Acceptance criteria and tests

Linked: `AC-ACCESS-001`, `AC-PERF-001`. Tests cover duration 2–3s; immediate skip keyboard/touch/screen reader; first vs returning; reduced motion; save-data/weak fallback; no catalog blocking; tab hidden/resize/back/focus; component tokens; no layout shift/flashing; AI real-stage progress; interaction remains interruptible.

## 11. Dependencies, risks, TBD and history

Dependencies: design/responsive/accessibility/performance/screens. Open: exact greeting copy, first-visit persistence duration, weak-device detection, particle visual prototype and animation implementation approach. Risks: motion sickness, delayed conversion, GPU drain, focus loss, effect inconsistency and intro replay annoyance.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены motion tokens, confirmed 2–3s starfield sequence, skip/reduced/degraded paths and component patterns. |
