# Final motion specification

This Phase 2C companion documents `P2C-DESIGN-005`, `011`, `014`–`017`.
Canonical behavior remains in `GLOBAL_SPEC.md` and
`MOTION_ANIMATION_SPEC.md`.

## Motion language

| Interaction | Duration |
|---|---|
| Immediate feedback | 100–160 ms |
| Button/hover/focus | 160–220 ms |
| Listbox/panel | 200–300 ms |
| Content reveal | 350–650 ms |
| Intro reveal | 700–1,200 ms per composed phase |

Motion communicates hierarchy and state; it is never required to discover an
action. There is no scroll-jacking, permanent parallax, bounce on business
actions, autoplay video, Three.js, GSAP, Lenis, Lottie or continuous WebGL loop.

## Starfield intro

The first-visit overlay lasts approximately 1.8–2.6 seconds, has a visible
“Пропустить” action, stores `intro_seen_v1`, loads in parallel with semantic
content and cleans up its bounded Canvas 2D loop on completion/unmount. Hidden
tabs pause work. A static fallback is available and reduced motion bypasses the
flight immediately. The isolated production chunk is 3,380 bytes.

## Five-stage AI progress

The five visible stages share one connecting track. Completed/current segments
light progressively and a bounded highlight travels along the active segment;
the UI never presents fabricated percentages or imaginary technical work.
Reduced motion keeps the same completed/current state with no travelling glow.

## Reduced motion and input

`prefers-reduced-motion: reduce` disables the intro flight, parallax and
nonessential movement, collapses reveal durations and preserves every action.
Hover is additive only. Keyboard, touch and pointer users receive the same
state, focus and recovery information.
