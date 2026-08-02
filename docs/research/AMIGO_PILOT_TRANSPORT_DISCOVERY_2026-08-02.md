# AMIGO Phase 1B.1 pilot transport discovery — 2026-08-02

## 0. Status

This is dated acquisition evidence for `PLAN-1B1-001`, not an eternal catalog fact or an assertion that AMIGO publishes an official API. Verification date: 2026-08-02, Europe/Moscow.

## 1. Priority discovery result

| Priority | Transport | Evidence/result | Phase 1B.1 decision |
|---:|---|---|---|
| 1 | Official partner API | No official API contract, schema or credentials were found/received. | Do not claim or call an API. |
| 2 | Partner export | No partner export sample or delivery contract was received. | Keep `TBD-SOURCE-AMIGO-002` open for future full import. |
| 3 | Excel/CSV/XML/YML/JSON | No authorized file was supplied. | Not selected. |
| 4 | Partner cabinet | AMIGO's official B2B material documents `www.b2b.amigo.ru`; `/personal/account/` requires authentication. No credentials were requested, stored or used. | Higher-priority future option only. |
| 5 | Authorized public pages | Product Owner explicitly authorized this fallback. Four official catalog pages respond `200` without login/CAPTCHA and expose stable card IDs and local media paths. | **Selected pilot transport.** |
| 6 | Manual manifest | A committed allowlist controls which discovered IDs may normalize/import; it is not fixture data. | Used as selection boundary, not as the source of business values. |

Official evidence: [AMIGO catalog](https://shop.amigo.ru/catalog/), [roller materials](https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/), [Zebra materials](https://shop.amigo.ru/rulonnye-shtory-zebra/rulonnye-tkani-zebra/), [horizontal aluminum materials](https://shop.amigo.ru/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/), [vertical materials](https://shop.amigo.ru/vertikalnye-zhalyuzi/vertikalnye-tkani/), [partner cabinet guide](https://amigo.ru/out/IT_RESURS/images/b2b.amigo.pdf), [robots.txt](https://shop.amigo.ru/robots.txt).

## 2. Observable stable source identity

Each material card exposed the same bounded structure on repeated reads:

- numeric Bitrix element `data-id` (also present in the element DOM ID);
- numeric source section `data-sec`;
- canonical category path `data-page`;
- exact source title, visible material/article text and color text where published;
- current Moscow/Moscow Region card price «от» or missing price state;
- one or two relative `/upload/iblock/...` image paths.

The importer therefore keys source entities by `AMIGO_PUBLIC_WEB + source section + numeric data-id`, never by display name. `sourceSlug` is a deterministic local representation of that identity, while `sourceUrl` remains the exact category URL captured in the snapshot.

Repeated discovery returned 20 unique cards per first page and stable IDs. System cards likewise exposed numeric element IDs. Selected system identities are `7556`, `7557`, `7542`, and `7543`.

## 3. Real pilot selection

The frozen allowlist in `PLAN-1B1-001` contains 32 current cards: eight roller, eight Zebra, eight horizontal aluminum and eight vertical. It includes several colors and published price bands, roller blackout, Zebra blackout, 25×0.18 aluminum lamellae and 89 mm vertical fabrics.

All 32 selected cards exposed a non-zero published «от» price at discovery time. These are source price references in their published regional/card context, not a dimensional formula or local final offer. Exact source price-category meaning was not present on each card; opaque tokens are captured but not promoted to a public facet until mapping is verified.

## 4. Media preflight

A selected material image returned `200`, `Content-Type: image/jpeg` and `Content-Length: 515180`. The actual importer must still stream with a bounded timeout/redirect count, reject non-HTTPS and non-allowlisted hosts/private addresses, enforce a byte ceiling, sniff MIME independently, decode only supported images under pixel/decompression limits, hash before storage, deduplicate by hash and write through the existing private-zone storage port. No hotlink is used.

Only media referenced by allowlisted cards may be downloaded. Primary/detail roles are preserved where the source publishes both. Source deletion never removes a stored binary automatically.

## 5. Access and operational controls

- Host allowlist: `shop.amigo.ru`; HTTPS only; no credentials or cookies.
- Page paths are the four explicit catalog paths above; no `/bitrix/`, search, login, action, filter or CAPTCHA endpoints.
- Maximum concurrency `1`; minimum delay between source requests; bounded retry with exponential backoff and jitter; descriptive `User-Agent`.
- Daily discovery creates a staged diff only. Manual sync requires OWNER/ADMIN. Neither path activates `CatalogVersion` or `PriceVersion` automatically.
- Raw HTML is treated as inert bytes: never executed, injected into UI or exposed publicly. Only allowlisted text/attributes are normalized and sanitized.

## 6. Residual risks

Public DOM and prices are volatile. A parser-version change, missing allowlisted ID, changed currency/region context, unexpected redirect, CAPTCHA/access response, unknown MIME or malformed page fails closed into sync/diff review. The full-catalog preferred transport/export remains unresolved and is a Phase 1B.2 gate; it does not authorize expansion beyond the 32-ID pilot.
