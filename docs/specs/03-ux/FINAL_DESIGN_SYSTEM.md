# Final Premium Interior Tech design system

This Phase 2C companion records the implemented interpretation of
`P2C-DESIGN-001`–`020`. The canonical product requirements remain in
`GLOBAL_SPEC.md`; this file does not create a second requirement source.

## Visual language and tokens

The application uses one light-first `PREMIUM INTERIOR TECH` language: warm
paper and white surfaces, near-black ink, restrained walnut/bronze/gold and
sage accents, tactile material imagery and calm architectural spacing. The
semantic tokens in `apps/web/app/tokens.css` cover color, typography, spacing,
radii, borders, shadows, layout widths, focus, z-index and motion. Public and
staff routes consume the same aliases; the staff shell removes marketing
decoration but does not introduce a second Android/Material visual system.

Cards are separated primarily by surface, border and space. Gold is an accent,
not a body-text color. Large black slabs, acidic colors, permanent neon glow,
decorative glass on every card and heavy shadows are outside the system.

## Layout and responsive behavior

- Public content uses bounded reading and gallery widths rather than stretching
  across the viewport.
- Mobile navigation and sticky calls to action include safe-area space and do
  not cover form controls.
- Critical targets are at least 44 CSS pixels; the fixed Phase 2C matrix covers
  320×568 through 1920×1080 without horizontal page overflow.
- Catalog imagery uses deliberate aspect ratios and responsive image sizing;
  texture is never stretched.
- Loading, empty, validation, unavailable, error, disabled and success states
  preserve layout and use plain Russian recovery text.

## Content and brand boundary

Published `SiteSettings` are authoritative. Until final brand/logo/legal copy
is approved, Preview uses the neutral “Жалюзи на заказ” fallback and the staff
settings page keeps the production warning. `PROJECT_NAME`, UUIDs, source IDs,
raw enums, object paths and provider errors are not public labels. AMIGO media
remains supplier catalog media; an empty owner portfolio is shown honestly.

## Implementation evidence

The optimized Next.js build has 33 dynamic routes. Excluding the unrelated
`.next/dev` cache, the measured production artifact contains 820 files
(32,941,934 bytes), 25 static JavaScript chunks (1,285,612 bytes), a 3,380-byte
intro chunk and 127,454 bytes of route CSS. A local Chromium lab observation at
1440×900 recorded LCP 520 ms, CLS 0, one long task, a 30,947-byte optimized
image sample and 395 ms navigation. These are lab observations, not field Core
Web Vitals or a production SLA; no INP claim is made without a representative
interaction sample.
