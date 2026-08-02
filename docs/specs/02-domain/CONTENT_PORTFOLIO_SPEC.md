# Content and portfolio specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — content lifecycle and provenance rules defined; actual content inventory pending |
| Версия | 0.2.0 |
| Дата | 2026-08-02 |
| Rights source | [ASSET_RIGHTS_REGISTER.md](../../00-global/ASSET_RIGHTS_REGISTER.md) |
| UX source | [INFORMATION_ARCHITECTURE.md](../03-ux/INFORMATION_ARCHITECTURE.md) |

## 1. Назначение and boundaries

Спека определяет page/content records, local portfolio, AMIGO partner examples, partner badge, product/material editorial content, publication/review/retirement and truth/rights boundaries.

In scope: content types/fields, provenance, attribution/labels, asset roles, author/reviewer/approver, locale/SEO references, previews, scheduling, versioning, revocation and content analytics.

Out of scope: actual copywriting/legal text still TBD, CMS/vendor, mass media import, user-generated public gallery and using client photos as portfolio without separate consent/legal basis.

## 2. Actors and permissions

Content manager drafts/maps; subject expert verifies technical/business facts; rights approver verifies media/partner scope; Business Owner is decision authority for the local portfolio and commercial conditions; owner/admin publishes only through granted capability; auditor reads history. No single role gains rights merely by uploading a file, and Business Owner portfolio selection does not replace asset-level rights/consent review.

## 3. Content types

| Type | Purpose | Required provenance/labels |
|---|---|---|
| `Page` | Home, catalog/help/service/legal/contact content | Owner, content version, evidence refs for claims |
| `CatalogEditorial` | Family/system/model/material description | Exact domain IDs/source and technical verification |
| `PartnerStatement` | Official partner context/badge | PartnerRelationship version/scope/brand notes |
| `PartnerExample` | AMIGO example/product inspiration | Label `Пример AMIGO/партнёра`, source/right mapping |
| `LocalPortfolioProject` | Work actually performed by local business | Owner-created media, project facts, consent/PII review |
| `ServiceContent` | Free measure/delivery/install, region, lead time, warranty | `BUSINESS-*` version and legal review where needed |
| `InstallmentContent` | Neutral/current future terms | Approved content version; current exact phrase only |
| `Help/MeasurementGuide` | User instructions/warnings | Master/UX review; no guessed dimensions |
| `FAQ` | Answer verified repeated questions | Source/owner/date and no hidden legal promise |
| `SEORecord` | Title/description/canonical/structured data | Mirrors visible truthful content, no misleading claims |

## 4. Нормативные требования

- **CONTENT-SPEC-001 — MUST:** every content record has stable ID, type, locale, owner, status, revision, author/reviewer/approver, timestamps and evidence references.
- **CONTENT-SPEC-002 — MUST:** content claim about price, availability, technical limit, lead time, region, service, warranty, installment or partner status references a canonical versioned fact/policy.
- **CONTENT-SPEC-003 — MUST:** source catalog text MAY be adapted within permission scope but must preserve identity/meaning and not imply independent authorship of AMIGO facts/images.
- **CONTENT-SPEC-004 — MUST:** AMIGO examples are labelled as partner/source examples and MUST NOT be placed under `Наши работы` or equivalent local completion claim.
- **CONTENT-SPEC-005 — MUST:** local portfolio claim requires evidence that work was performed by the local business plus rights/consent/PII review for every asset.
- **CONTENT-SPEC-006 — MUST:** client production photos are private by default and cannot enter public portfolio through a generic upload consent.
- **CONTENT-SPEC-007 — MUST:** every media placement links exact `MediaAsset` revision, domain/content entity, `assetRole`, rights and publication status.
- **CONTENT-SPEC-008 — MUST:** partner badge/logo placement uses approved asset/text fallback, alt/label, attribution and brand notes; revoke propagates to every surface.
- **CONTENT-SPEC-009 — MUST:** product/material image is not published under wrong SKU/variant or as generic substitute.
- **CONTENT-SPEC-010 — MUST:** content and media publication are separate decisions; approved text cannot expose blocked asset and vice versa.
- **CONTENT-SPEC-011 — MUST:** unpublished/draft/review content is excluded from public/SEO/feed/search outputs.
- **CONTENT-SPEC-012 — MUST:** scheduling uses authoritative time/effective interval; expired/revoked content stops public delivery and preserves history.
- **CONTENT-SPEC-013 — MUST:** content edits create revisions; public pages resolve one approved active revision and support rollback.
- **CONTENT-SPEC-014 — MUST:** technical/legal/business reviewer is selected by claim type; content manager cannot self-validate unknown facts.
- **CONTENT-SPEC-015 — MUST:** dynamic catalog category can use neutral generated structure/labels, but editorial claims require evidence and review.
- **CONTENT-SPEC-016 — MUST:** current installment content is exactly neutral and prohibited claims are scanned across visible/metadata/structured data.
- **CONTENT-SPEC-017 — MUST:** partner/media attribution and copyright/brand requirements remain visible in derivatives/export contexts as required.
- **CONTENT-SPEC-018 — MUST:** personal/contact/address/order data is excluded from public content and previews; redaction occurs before review/publication.
- **CONTENT-SPEC-019 — MUST:** links/canonical/structured data match actual page state and region/service truth; hidden keyword pages are prohibited.
- **CONTENT-SPEC-020 — MUST:** content deletion/revoke includes page caches, search indexes, feeds, derivatives and external publication surfaces under control.
- **CONTENT-SPEC-021 — MUST:** Business Owner determines which verified local works belong to `LocalPortfolioProject` and the applicable commercial framing, but every project/asset still requires evidence, rights/consent/PII review and independent publication approval.
- **CONTENT-SPEC-022 — MUST:** AMIGO remains source authority for AMIGO catalog-image identity and product/material mapping; importing metadata into PostgreSQL or binaries into object storage never reclassifies an AMIGO asset as local portfolio.

## 5. Content record and fields

`contentId`, type, locale, slug/aliases, title/summary/body structured blocks, CTA references, domain entity refs, evidence/requirement refs, asset placement refs, provenance/attribution, owner, author/reviewer/approver, status/revision, review/publication/effective/expiry/retired timestamps, SEO record, change reason, sensitivity, analytics key, checksum.

Structured blocks use allowlisted types and sanitization; arbitrary executable HTML/script is prohibited. CTA links to typed product action (`OPEN_CATALOG`, `CONFIGURE`, `STANDARD_PREVIEW`, `AI_VISUALIZER`, `MEASUREMENT`, `WHATSAPP`, `INSTALLMENT_INQUIRY`) and inherits readiness.

## 6. Asset roles and placement

Canonical roles include `PRODUCT_HERO`, `MATERIAL_SWATCH`, `MATERIAL_TEXTURE`, `PRODUCT_DETAIL`, `SYSTEM_DIAGRAM`, `PARTNER_BADGE`, `PARTNER_EXAMPLE`, `LOCAL_PORTFOLIO_BEFORE`, `LOCAL_PORTFOLIO_AFTER`, `INTERIOR_SCENE`, `PREVIEW_LAYER`, `ICON/UI`. Role controls aspect/derivative/crop/alt/attribution and cannot change underlying rights.

A single original MAY have multiple derivatives/roles only when license and transformation policy permit. Each derivative stores parent/hash/transform and is revoked/deleted with graph policy.

## 7. Content lifecycle

`DRAFT → IN_REVIEW → CHANGES_REQUESTED → APPROVED → SCHEDULED/PUBLISHED → SUPERSEDED/EXPIRED/RETIRED/BLOCKED`. Rights revocation can move asset placements/content to `BLOCKED`; public fallback may use text/other separately approved asset.

Publication checks:

1. required fields/links/domain refs resolve;
2. claims map canonical facts/versions and reviewers;
3. asset rights/publication/mapping/role valid;
4. PII/legal/brand/technical checks pass as applicable;
5. accessibility (heading/alt/link labels/transcripts) and responsive preview pass;
6. SEO/structured data matches visible truth;
7. target environment/effective time and rollback revision are clear.

## 8. Local portfolio vs partner examples

| Dimension | Local portfolio | AMIGO partner example |
|---|---|---|
| Claim | Work performed by local business | Example from authorized partner catalog/source |
| Evidence | Project/order/business confirmation | Source asset/provenance/partner scope |
| Label | `Наши работы` only when evidence | `Пример AMIGO`/approved partner wording |
| Client data | Separate publication consent/redaction | No local client attribution |
| Product mapping | Actual installed product where known | Source product/material mapping |
| AI use | Separate permission/basis | Reference/render use per partner scope; no training |
| Revocation | Consent/rights/business policy | Partner/license/brand policy |

## 9. Primary and alternative flows

### Draft/publish

Create typed record → attach domain facts/evidence/assets → preview all surfaces/viewports → route subject/rights/owner review → approve/schedule/publish → monitor/periodically verify → revise/retire.

### Asset unavailable

If mapped asset blocked/missing, content remains draft/blocked or uses an independently approved fallback. It does not hotlink or reuse another material. Badge may fall back to truthful text.

### Fact changes

Source/business version change marks dependent records `REVIEW_REQUIRED`; active content MAY remain only within approved policy and with no false claim. Price/availability content should be data-driven and freshness-aware rather than copied prose.

### Revoke

Block delivery first → find placements/derivatives/caches/index/feed → substitute/remove safely → audit → retention/delete. Historical private evidence remains only as policy allows.

## 10. Validation, errors and edge cases

- unique active slug per locale/scope; alias/canonical redirect versioned;
- no broken domain/entity/asset/evidence reference;
- required alt/label/heading order and descriptive link text;
- no prohibited installment/price/availability/warranty wording;
- no `Наши работы` label on partner example;
- no future publication after asset/permission expiry;
- no PII in public draft preview, metadata, filename, EXIF or structured data;
- concurrent edit/approval version conflict;
- approval invalidates if content/assets/evidence change;
- locale fallback cannot show outdated/unapproved claims;
- deleting category preserves historical links with safe tombstone/redirect;
- external links validated and no private/signed URL published.

Errors: `CLAIM_EVIDENCE_MISSING`, `REVIEW_REQUIRED`, `ASSET_RIGHTS_BLOCKED`, `ASSET_MAPPING_CONFLICT`, `PII_DETECTED`, `ACCESSIBILITY_INVALID`, `SEO_MISMATCH`, `VERSION_CONFLICT`, `PUBLICATION_WINDOW_INVALID`. All block affected publication.

## 11. Security, privacy, performance and analytics

Content input is sanitized; upload/media pipeline handles files; preview requires auth and no secret share. Public output has CSP-compatible structured blocks. Client/private data never enters content store by copy/paste without detection/review. Content and derivatives are optimized/cached by revision; revoke invalidates. Analytics: page/content revision, CTA, search discovery, broken/blocked asset and review age, not private preview or staff free-text.

## 12. Acceptance criteria and tests

Primary: `AC-PORTFOLIO-001`, `AC-ASSET-MAP-001`, `AC-ASSET-REVOKE-001`, `AC-BADGE-001`, `AC-INSTALLMENT-001`, `AC-ACCESS-001`.

Tests: local vs partner labels; missing/expired/revoked rights; wrong variant mapping; badge fallback; PII/EXIF/filename; claim evidence; installment prohibited wording across HTML/metadata/schema/messages; approval invalidation; schedule/timezone/rollback; locale/slug/redirect; responsive/accessibility; cache/search/feed invalidation.

## 13. Dependencies, risks and open questions

Dependencies: catalog/media/storage/admin/UX/SEO/security. Open: final brand/name, exact partner attribution/brand guidelines `TBD-ASSET-AMIGO-003`, content inventory/voice, legal pages/requisites `TBD-BIZ-005`, local project evidence/consent templates and editorial review cadence. Risks: false authorship, wrong SKU image, stale business claim, public PII, metadata leakage, content/asset approval mismatch and SEO duplication.

## 14. Связанные requirements and history

Links: `PARTNER-*`, `ASSET-*`, `FR-CATALOG-*`, `BUSINESS-*`, `CONTENT-SPEC-001`–`020`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены content types, claims/provenance, local-vs-partner portfolio boundary, lifecycle, publication/revocation and tests. |
| 0.2.0 | 2026-08-02 | По `OWNER-DECISION-008` Business Owner закреплён как portfolio/commercial decision authority, а AMIGO image identity сохранена отдельно от PostgreSQL/object-storage copies и local-work claims. |
