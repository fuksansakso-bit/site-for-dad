# Final component inventory

This implementation inventory supports `P2C-DESIGN-001`–`020`; canonical
requirements remain in `GLOBAL_SPEC.md`.

| Component/pattern | Production use and contract |
|---|---|
| Public shell | Skip link, header, desktop navigation, safe-area mobile navigation and footer on public routes. |
| Admin frame | Restrained Russian sidebar/drawer, top bar, breadcrumbs, role-aware navigation, user state and sign-out. |
| Button/link/icon action | Shared sizes, focus ring, pending/disabled state and at least 44 px critical targets. |
| Field/search/number/phone | Visible labels, 16 px mobile text, inline validation, programmatic error association and correct input mode. |
| `PremiumSelect` | Portalled combobox/listbox used by catalog and staff filters; hidden form value, selected state, arrows, Home/End, Enter/Space, Escape and outside close. No native `<select>` remains in active TSX. |
| Category tabs | Premium tab semantics for current catalog/calculator grouping, including “День-ночь / Зебра”. |
| Material card/option | Source-backed image, name, article, category, availability, positive AMIGO “от” price and select/detail actions. |
| Exact price summary | Width/height, one-unit exact AMIGO amount, active version and add-to-cart action; no local minimum/manual/zero fallback. |
| Cart item/summary | Repriced server-authoritative identity, dimensions, quantity and totals with edit/remove/checkout actions. |
| Checkout/request receipt | Guest validation, pending/success safety, immutable request amount and truthful WhatsApp open/copy behavior. |
| AI stepper/upload/before-after | Five connected states, private consent/upload, provider-safe errors, retry/delete and keyboard-capable comparison. |
| Skeleton/empty/error/notice | Stable route states with explanation and recovery action; no technical enum or secret. |
| Admin data card/table/mobile card | Dense readable business data, premium listboxes, sticky table header where appropriate and bounded horizontal table scroll only. |

The browser suite verifies listbox keyboard operation at 360×800, exact Zebra
selection/calculation/cart, reduced motion, the ten-viewport matrix and thirteen
visual baselines.

