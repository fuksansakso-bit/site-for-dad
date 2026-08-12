# AMIGO exact pricing mapping — 2026-08-13

## Result

The immutable source version `amigo-67c782a10449cdb7` is active in the configured Supabase development project. Its generated artifact is `tooling/phase2a/generated/amigo-exact-price-version.json`, captured at `2026-08-12T21:24:17.945Z` with semantic SHA-256 `67c782a10449cdb750a58f1da8b0a0f0fa676b3d794f1593d7671a8c1b8a3469`.

The fixed-path capture retained 1,428 existing local source IDs and ignored zero unknown live IDs. Exactly 1,131 rows have a positive current AMIGO `FROM` price and one unambiguous calculator material/model mapping. Only those rows are public and priceable. The other 297 rows remain retained for staff review and are not replaced by a formula, zero, local minimum or manager-price fallback.

| Mapping state | Rows | Public |
|---|---:|---|
| `READY` | 1,131 | Yes, while its source version is active and the material/category/image remain published |
| `AMBIGUOUS_CALCULATOR_MATCH` | 133 | No |
| `NO_CALCULATOR_MATCH` | 109 | No |
| `MISSING_CURRENT_FROM_PRICE` | 55 | No |

## Fixed source scope

| AMIGO collection path | Retained | `READY` |
|---|---:|---:|
| `/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/` | 102 | 82 |
| `/gorizontalnye-derevyannye-zhalyuzi/bambuk-derevo-plastik/` | 80 | 0 |
| `/rimskie-shtory/porternye-tkani/` | 154 | 138 |
| `/rulonnye-shtory/rulonnye-tkani/` | 431 | 346 |
| `/rulonnye-shtory-zebra/rulonnye-tkani-zebra/` | 150 | 137 |
| `/shtory-mirazh/tkani-mirazh/` | 27 | 23 |
| `/shtory-plisse/tkani-plisse/` | 218 | 169 |
| `/vertikalnye-zhalyuzi/vertikalnye-tkani/` | 242 | 220 |
| `/vertikalnye-zhalyuzi/vertikalnyy-plastik-alyuminiy/` | 24 | 16 |

The two vertical collection paths are projected as one customer category, producing seven public groups. The wood collection is retained but hidden because strip-length-dependent calculator matches are not uniquely demonstrated. This is a safe exclusion, not an empty placeholder.

## Mapping and runtime boundary

- `tooling/phase2a/refresh-amigo-pricing.ts` requests only the nine fixed collection paths above and the calculator models needed by their retained local rows. It is sequential, bounded by timeout/retry and does not discover or activate new IDs.
- A row becomes `READY` only when its current card identity/price and calculator identity can be joined deterministically by the recorded family, article/vendor code, normalized name and width evidence. Ambiguity always excludes the row.
- The browser submits only material slug, width, height and quantity. It cannot choose provider origin/model/material IDs or provide a price.
- The server adapter pins the AMIGO calculator HTTPS origin, rejects redirects/oversized or malformed responses, converts a positive whole-ruble response to integer kopecks and persists the fact in a version/model/material/dimension cache.
- Price and order routes accept only the single active version. The order RPC independently revalidates its cache tuple in PostgreSQL before writing immutable snapshots.
- `amigo_price_versions` content is immutable; only the active pointer may change. Existing order snapshots and historical Phase 1 price records are not rewritten.

## Executed evidence

`pnpm pricing:verify-live` passed against project `jlvozofcymlnniqsheec` with seven public categories, 1,131 public materials, 137 Zebra rows, OWNER readiness and transaction rollback. Zebra material `amigo-material-12114` at 1,000 × 1,000 mm produced 1,185,000 kopecks (11,850 ₽), and the same amount was revalidated in the browser cart. The generated artifact tests also prove that no retained `READY` row contains a local minimum.

No production activation, AMIGO credential claim, unknown-path discovery, source deletion or automatic activation occurred.
