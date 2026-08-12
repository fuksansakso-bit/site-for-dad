# Phase 2C final route and UX audit

## Public routes

| Route | Final behavior and evidence |
|---|---|
| `/` | Source-backed premium landing, bounded intro, category/process/material/calculator/AI/portfolio/trust/AMIGO/FAQ/final CTA/footer composition; missing portfolio and optional settings stay honest. |
| `/catalog` | Seven active grouped categories, 1,131 `READY` materials, search, premium listbox filters, sorting, result count and incremental rendering. No zero/manual price or native selector is exposed. |
| `/catalog/[slug]` | Published active material, image/facts/availability/current AMIGO `FROM` price and exact-calculator/conditional-AI actions; invalid/incomplete slugs are 404. |
| `/calculator` | Premium category tabs and searchable image material list; exactly width and height after selection; quantity starts at one; server returns current AMIGO amount. |
| `/cart` | Browser stores only identity/dimensions/quantity/optional AI reference; every item is repriced by the active server version before total/checkout. |
| `/checkout` | Guest contact/services/installment-interest form with validation and no payment or confirmed-order claim. No synthetic PII submission was used for visual QA. |
| `/request/[publicReference]` | Immutable safe summary, status, services, saved total and truthful WhatsApp open/copy behavior. Invalid references return non-enumerable 404. |
| `/portfolio` | Only separately approved owner work; configured empty state does not reuse supplier catalog media. |
| `/visualizer` | Five connected stages, private upload/consent/processing/result and honest disabled/provider/error/retry states. |
| `/visualizer/[publicReference]` | Owned result/before-after/cart/change/delete flow; cross-session or invalid references fail closed. |

## Staff routes

| Route | Final behavior and evidence |
|---|---|
| `/admin/login` | Russian staff-only sign-in with pending/error/password-reveal behavior and no public marketing shell. |
| `/admin` | Restrained dashboard with role-aware navigation, exact-catalog metrics and safe sign-out. |
| `/admin/materials` | 1,428 retained rows, Russian mapping readiness, AMIGO price/version evidence and only availability/publication changes for `READY` exact rows. Source price/formula/minimum cannot be edited. |
| `/admin/orders` | Immutable request composition/amount plus authorized internal status/note actions. |
| `/admin/portfolio` | Rights-aware owner-work upload/publication; no seeded fake work. |
| `/admin/settings` | Real business content, social/partner controls and visible final-brand production warning. |
| `/admin/staff` | OWNER-only roles/status controls with final active OWNER protection. |
| `/admin/ai-visualizations` | Safe metadata/settings/limits/cleanup, temporary explicit image grants and no customer-photo gallery. |

The configured OWNER authenticated successfully through `/admin/login`; dashboard and materials rendered from live Supabase with Russian labels. No password is stored in source or reported in evidence.

## Responsive, interaction and accessibility evidence

The automated browser matrix covers 320×568, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080. Landing, catalog, calculator, visualizer and staff login have no horizontal overflow at any profile. Critical controls meet the 44 px target, mobile bottom navigation respects content space, and reduced-motion mode keeps all routes usable.

Six Chromium checks cover Zebra → 1,000×1,000 → 11,850 ₽ → cart, premium-listbox keyboard control, ten-viewport reflow, route/status safety, 13 stable visual baselines and local lab observations. Manual in-app-browser review also covered the authenticated dashboard/material table and the connected animated five-stage AI progress line.

Automated checks do not replace a production screen-reader/real-device study. Final brand/legal content, live successful Polza output and a disposable-project restore drill remain explicit production gates rather than hidden skips.
