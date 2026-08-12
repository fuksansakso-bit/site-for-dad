# ADR-0015: Bounded AMIGO exact-price adapter and versioned public mapping

- **Status:** Accepted
- **Date:** 2026-08-13
- **Decision owners:** Product Owner; Business Owner for AMIGO price authority
- **Supersedes:** new-public-quote portions of ADR-0013 and the no-runtime-AMIGO portion of the historical Phase 1C boundary; historical snapshots remain unchanged
- **Related:** `OWNER-DECISION-025`, `FR-CALC-025`–`031`, `EXTSRC-029`–`034`, `TBD-PRICE-009`

## Context

The simplified Supabase catalog contains 1,428 retained AMIGO materials, but only four legacy Phase 1C rule scopes have independently proven dimensional formulas. The Phase 2A projection therefore publishes many materials with a manual-price status and applies a local 150,000-kopeck minimum to the few area-priced rows. It also exposes empty parent categories because materials belong to leaf categories while the client filters by an exact parent slug.

On 2026-08-13 the Product Owner explicitly cancelled the local minimum, required every public card to show the current AMIGO «от» amount, required the customer to enter only width and height after selecting a material, and prohibited placeholders. Normal AMIGO UI verification showed that its public customizer auto-selects mandatory defaults: `MINI` + `ЛИНА BLACK-OUT 2259` + `1000×1000` produced `2695 ₽`; the same bounded `POST /api/calculate` request with local model/material resolution produced the identical result. The shop card ID and customizer material ID are different namespaces, so direct ID reuse is unsafe.

## Drivers

- match the AMIGO amount instead of inventing or extrapolating a formula;
- keep source price, mapping and calculation evidence versioned and auditable;
- accept only local material + integer width/height from the browser;
- remove all public `MANUAL`/`PRICE_ON_REQUEST`/manager-price states;
- keep incomplete or ambiguous materials out of the public projection;
- preserve historical quote and order bytes;
- avoid copying supplier code, using cookies/login or depending on an arbitrary URL;
- retain one standard Next.js + Supabase deployment.

## Options considered

1. Treat each AMIGO card `FROM` amount as a square-metre rate — rejected because the card amount is not a proven formula.
2. Generalize the four Phase 1C rules to every material — rejected because model, rounding, minimum area and option behavior are not proven across scopes.
3. Keep manual-manager fallback — rejected by the Product Owner and incompatible with a fully functional public flow.
4. Precompute every possible width/height — rejected because the input space is large and price changes would make the matrix stale.
5. Use a bounded server-only exact customizer adapter with an immutable local mapping/version and exact-result cache — selected.

## Decision

A controlled refresh reads only the nine retained material collection paths on `https://shop.amigo.ru` and their own `PAGEN_*` references at concurrency one. It joins only material identities already present in the retained Supabase catalog. Separately, it reads the allowlisted observed customizer model/material lists for a fixed set of canonical models. The mapping artifact records distinct shop card and calculator IDs, exact model, source-card `FROM` amount, safe labels, mapping outcome, counts and semantic checksums. A zero/multiple/stale match or missing numeric price makes the row non-public.

Activation is additive and transactional in Supabase. It creates an immutable AMIGO exact price version, supersedes only the previous active pointer, stores the reviewed card and mapping checksums, sets ready materials to `AMIGO_EXACT`, clears the historical local minimum/area/fixed fields for new calculations, and removes incomplete rows from public views without deleting them. Public categories are projected from priceable descendant leaf materials and expose the nearest retained parent group; this makes Zebra and other parent categories non-empty without changing source ownership.

The browser calls only the same-origin PROJECT_NAME price route with local material slug, width and height. The server independently resolves the active local version, model ID, customizer material ID and source evidence. It MAY call only `POST /api/calculate` on the exact HTTPS customizer origin pinned by that active version, with no cookies or credentials, strict origin/path, redirect, timeout, rate/concurrency and response-schema/amount controls. Default options are selected by the observed calculator behavior; the client cannot supply them. The safe integer RUB result is cached by complete version/material/model/dimensions key.

Checkout performs a fresh server calculation for each item before the service-role-only database function creates an immutable order snapshot. The database verifies the supplied source version and model/material IDs against the active material mapping, multiplies quantity with checked integer arithmetic and stores calculation provenance. No public request can provide a trusted amount.

## Consequences

- every displayed material has a real current source-card amount and an exact calculator path;
- the customer-facing calculator needs only material, width and height;
- a newly listed AMIGO card may remain hidden until the customizer mapping appears and is reviewed;
- a valid uncached quote depends briefly on the mutable customizer, while repeated exact keys can use the active-version cache;
- category counts may decrease from the raw retained catalog because incompleteness now fails publication;
- daily/manual price refresh and activation become operationally important;
- this transport is observed and volatile, not represented as an official AMIGO API.

## Risks and controls

- **Supplier transport drift:** immutable origin/path/version evidence, schema validation, short timeout, safe failure and refresh review.
- **Wrong material mapping:** separate namespaces, deterministic normalized name/article/width/model matching, unique-match requirement and mapping report.
- **Source load:** nine fixed paths, pagination only from those paths, concurrency one, delay/backoff/timeout and no quote precomputation.
- **Client tampering/SSRF:** no external identifiers or URL accepted from the browser; constant/pinned HTTPS origin and path.
- **Stale or partial price:** active semantic version, exact diff/counts/checksums, fail-closed public view and explicit activation.
- **Historical repricing:** additive columns/tables and immutable old order/quote snapshots; recalculation creates a new snapshot.
- **Source outage:** exact cache for the active key; otherwise a technical failure without amount, never a guess or manager placeholder.

## Rollback

Reactivate the preceding immutable price version and rebuild the public projection, or disable new exact calculations while retaining catalog browsing and every historical snapshot. Do not restore the 1,500-ruble minimum or manager placeholder without a new written owner decision. If the observed transport becomes inaccessible or contractually unavailable, stop new quotes and select a replacement source/independent verified formula through a superseding ADR.
