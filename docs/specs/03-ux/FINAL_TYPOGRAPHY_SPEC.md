# Final typography specification

This Phase 2C companion documents the implementation of `P2C-DESIGN-003` and
the typography portion of `P2C-DESIGN-015`. Canonical requirements remain in
`GLOBAL_SPEC.md` and the existing UX specifications.

## Families

- `Manrope` is the UI, body, form, navigation, status and tabular-data family.
- `Cormorant Garamond` is limited to editorial hero and section display text
  where its contrast remains readable.
- Both are self-hosted through `next/font`, include Cyrillic, have safe system
  fallbacks and require no runtime font CDN.

If the display face harms readability at a particular size, Manrope is used.
No third decorative family is introduced.

## Scale and rhythm

| Role | Implemented range |
|---|---|
| Display XL | `clamp(3.2rem, 7vw, 7rem)`, line-height 0.92–1.02 |
| Display L | `clamp(2.5rem, 5vw, 5rem)`, line-height 0.98–1.08 |
| H1 | `clamp(2.4rem, 5vw, 4.8rem)` |
| H2 | `clamp(2rem, 4vw, 3.8rem)` |
| H3 | `clamp(1.4rem, 2.2vw, 2rem)` |
| Body large | 18–20 px |
| Body/control | 16–18 px |
| Small | 14–15 px |
| Micro metadata | 12–13 px |

Mobile inputs stay at least 16 px. Large headings use balanced wrapping where
supported; body copy stays within a readable line length. Uppercase is reserved
for short micro-labels. Prices use tabular numbers and visually subordinate
units. Russian words are reviewed for awkward or orphaned wrapping.

## Accessibility

Type never carries availability or error meaning alone. Text/background pairs
meet the WCAG 2.2 AA release target, visible focus is not suppressed, and zoom
or reflow does not clip the primary action. User-facing copy is Russian and
technical identifiers remain internal.

