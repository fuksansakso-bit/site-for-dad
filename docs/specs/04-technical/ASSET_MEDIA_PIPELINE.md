# Asset and media pipeline specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.1 controlled pilot media import authorized; user media/production pipeline gated |
| Версия | 0.4.0 |
| Дата | 2026-08-03 |
| Rights | [ASSET_RIGHTS_REGISTER.md](../../00-global/ASSET_RIGHTS_REGISTER.md) |
| Storage | [STORAGE_MEDIA.md](STORAGE_MEDIA.md) |

## 1. Purpose and boundaries

The pipeline registers, validates, stores, maps, reviews, publishes, revokes and deletes owner/partner media with full provenance. Phase 1B.1 MAY import only media referenced by the frozen pilot allowlist through the local private-by-default storage port; no full media crawl, user upload or production storage is authorized.

Out of scope: bulk scraping, hotlink, watermark removal, authorship change, training use, client-photo public content and arbitrary transformations beyond rights/profile.

## 2. Actors and permissions

Content manager registers/maps; rights approver/owner confirms scope; publication approver activates; catalog admin reviews domain mapping; media worker performs job-scoped scanning/transforms; delivery service serves only approved/private authorized objects. Upload alone grants no publication.

## 3. Нормативные requirements

- **MEDIA-PIPE-001 — MUST:** every original gets stable asset ID, cryptographic hash, source/rightsholder/basis/scope/date/evidence/restrictions and classification before use.
- **MEDIA-PIPE-002 — MUST:** partner assets record `PARTNER_LICENSE` and permission relationship revision; each public placement still requires asset-level `PUBLICATION_APPROVED` and exact mapping.
- **MEDIA-PIPE-003 — MUST:** source URL/reference is provenance, not delivery; public hotlink is prohibited.
- **MEDIA-PIPE-004 — MUST:** file signature/decode/size/dimensions/malware/metadata/content policy is validated in quarantine before managed storage/pipeline promotion.
- **MEDIA-PIPE-005 — MUST:** original bytes are immutable; normalized/edited/optimized outputs are derivatives linked to parent and transform version/settings/hash.
- **MEDIA-PIPE-006 — MUST:** metadata potentially containing PII/location/device/private paths is removed from public derivatives; evidence metadata remains controlled separately.
- **MEDIA-PIPE-007 — MUST:** every placement maps exact domain/content entity revision and `assetRole`; generic filename/folder mapping is insufficient.
- **MEDIA-PIPE-008 — MUST:** material/product image cannot be substituted across SKU/variant without approved mapping.
- **MEDIA-PIPE-009 — MUST:** supported transforms respect license/brand restrictions; watermark removal, logo distortion, false recoloring and attribution removal are prohibited.
- **MEDIA-PIPE-010 — MUST:** derivative profiles declare purpose, crop/fit/aspect/size/format/quality/color/alpha/animation policy and accessibility metadata needs.
- **MEDIA-PIPE-011 — MUST:** WebP/AVIF or later efficient formats MAY be generated for compatible public roles, with safe fallback; format conversion does not change rights.
- **MEDIA-PIPE-012 — MUST:** product/material fidelity preserves color profile/pattern/texture within approved review; lossy output cannot become canonical source.
- **MEDIA-PIPE-013 — MUST:** background/scene/preview layers and standard preview exports preserve profile/mapping/revision provenance.
- **MEDIA-PIPE-014 — MUST:** AMIGO examples are labelled partner examples; only verified owner-created assets can support `Наши работы`.
- **MEDIA-PIPE-015 — MUST:** public delivery is generated from publication projection; blocked/revoked/expired/mismapped asset is inaccessible and caches invalidated.
- **MEDIA-PIPE-016 — MUST:** revoke traverses usages/placements/derivatives/exports/caches/search/feeds and records outcome; historical evidence remains restricted.
- **MEDIA-PIPE-017 — MUST:** delete follows retention/license/legal policy and is idempotent; no broad path/prefix deletion without resolved exact asset graph.
- **MEDIA-PIPE-018 — MUST:** production client photos and partner media are not used for model training/evaluation fixtures without separate documented permission/basis.
- **MEDIA-PIPE-019 — MUST:** pipeline jobs are bounded, idempotent and cannot publish directly; human/policy approval is separate.
- **MEDIA-PIPE-020 — MUST:** telemetry stores asset/job/format/dimensions/duration/error codes, not image bytes/private URLs/secret source refs.
- **MEDIA-PIPE-021 — MUST:** AMIGO is source authority for AMIGO catalog-image identity, provenance and product/material relationship; an imported local copy or derivative MUST NOT change that authority or become owner-created/local portfolio.
- **MEDIA-PIPE-022 — MUST:** PostgreSQL stores MediaAsset/SourceAsset metadata, provenance, hashes, exact mappings, rights/publication states and opaque object references; binary originals/derivatives are stored in the managed object-storage zones, not product/material rows.
- **MEDIA-PIPE-023 — MUST:** Business Owner determines local portfolio composition, but pipeline promotion still requires creator/rightsholder evidence, consent/PII review where applicable, exact asset mapping and independent `PUBLICATION_APPROVED`.
- **MEDIA-PIPE-024 — MUST:** real Phase 1B.1 media import MUST NOT start or be committed until the configured storage adapter passes `STORAGE-SPEC-026`, including the exact 515,180-byte AMIGO JPEG byte/SHA round trip; HTTP success without content equality is insufficient.
- **MEDIA-PIPE-025 — MUST:** pilot intake preserves source URL as restricted provenance, applies SSRF allowlist/DNS-IP checks and bounded redirects, validates declared and detected MIME, size, dimensions and decompression limits, computes SHA-256, deduplicates by content, stores only generated safe keys and never executes HTML/SVG/script content.
- **MEDIA-PIPE-026 — MUST:** an unavailable individual AMIGO image records an item-level audited failure/diff and does not silently hotlink or necessarily fail unrelated items; no object is published or activated by successful intake alone.

## 4. Asset lifecycle

`DISCOVERED/RECEIVED → QUARANTINED → VALIDATING → REGISTERED → MAPPED → REVIEW_REQUIRED → PUBLICATION_APPROVED → PROCESSING → READY → PUBLISHED`; alternative terminal/controlled states: `REJECTED`, `PUBLICATION_BLOCKED`, `REVOKED`, `DELETION_PENDING`, `DELETED`.

Rights status and publication status are orthogonal. `PARTNER_LICENSE` does not itself mean published; `PUBLICATION_APPROVED` is tied to exact revision/scope/placements and invalidates on material rights/mapping changes.

## 5. Intake types

| Intake | Required evidence | Additional controls |
|---|---|---|
| Partner authorized file/export | Partner relationship/scope, source entity/asset ref, permission date/restrictions | No mass acquisition until approved transport/manifest |
| Owner-created local work | Creator/business evidence, project/product mapping | Client/person/property privacy/consent review |
| Client photo | Upload notice/consent/purpose, private owner | Separate private AI pipeline; never public intake |
| Physical catalog photo | Rightsholder/permission beyond ownership of copy | `PERMISSION_PENDING` until proof |
| UI/icon/design asset | Creator/license/dependency record | Consistent SVG/vector and supply-chain review |
| Generated preview | Parent configuration/assets/renderer/model versions | Private/public role and disclosure |

## 6. Required asset record

Fields: `assetId/revision`, authority class, category/classification, original object ref/hash/size/MIME/dimensions/color/alpha/animation, source record/entity/url/reference, rightsholder, permission basis/scope/relationship revision/date/evidence, restrictions/attribution/brand notes/training policy, rights/publication statuses, owner/actors/timestamps, domain mappings/assetRoles/placements, original/derivative graph, retention/delete policy, review/effective/expiry/revocation data, checksum.

No card may store raw credentials or private signed URL. Public alt/caption is content/placement data, not embedded rights evidence.

## 7. Quarantine and validation

Validation order:

1. authorized intake/manifest/object ownership;
2. bounded size/count/rate and cryptographic hash/duplicate lookup;
3. signature vs MIME/extension, safe decoding, dimensions/pixel/decompression/animation limits;
4. malware/active-content/polyglot and metadata extraction in isolated worker;
5. rights/source record required fields;
6. content policy/PII/watermark/brand restrictions review;
7. exact domain mapping and role applicability;
8. transformation/publication eligibility.

Failed object stays quarantined/rejected per retention; it is not publicly retrievable and cannot enter renderer.

## 8. Derivative profiles

| Role/profile | Typical outputs | Key rules |
|---|---|---|
| Material swatch | Small square/rect variants, WebP/AVIF fallback | No misleading crop/color shift; article mapping |
| Material texture | Higher fidelity tile/reference | Preserve repeat/orientation/color profile; renderer-only/public policy |
| Product hero/detail | Responsive aspect variants | Subject-safe crop, attribution/caption |
| Partner badge/logo | Approved original/vector/raster sizes | No distortion/recolor; clear-space profile |
| Portfolio/example | Responsive gallery/thumb/social export if allowed | Correct local/partner label; PII review |
| Scene/render layer | Lossless/alpha as needed | Coordinate/profile mapping, not direct editorial crop |
| Preview output | Share/export sizes/formats | Parent configuration/revision/disclosure; metadata sanitization |

Exact formats/quality/dimensions are validated by visual/performance test and asset role; no one-size global value is invented.

## 9. Mapping and publication

Mapping workflow selects source/domain entity by stable ID, verifies visible content/article/color against evidence, chooses assetRole and placement scope. A second review is required where rights/publication or high-risk partner brand policy demands. Approval binds exact original/derivative/placement/checksums. Changing parent, transform, mapping, caption/attribution or permission invalidates dependent approval as policy.

Public projection exposes only delivery key/derivative, alt/caption/attribution and safe revision/cache metadata. Internal source/evidence/rights notes remain staff-only.

## 10. Revocation and deletion

Revoke is block-first:

1. set publication blocked/revoked transactionally;
2. emit invalidation to delivery/cache/search/content/render profiles;
3. prevent new derivative/job/share;
4. enumerate exact usages/derivatives/exports and substitute/remove;
5. execute storage/provider cleanup per policy;
6. verify inaccessible and record audit/tombstone.

Delete uses explicit asset graph IDs and resolved storage namespace, never computed broad recursive path. Failed cleanup stays inaccessible and retries/alerts.

## 11. Errors, edge cases and recovery

| Case | Handling |
|---|---|
| Duplicate hash same/different claimed source | Reuse only after rights/mapping review; preserve claims/conflict |
| Same visual different bytes | Perceptual duplicate is suggestion, never rights merge |
| Wrong/unknown MIME or decompression bomb | Reject quarantine |
| Animated/transparent/vector active content | Role-specific sanitizer or reject |
| EXIF/location/person/license text | Remove public metadata; privacy/rights review |
| Asset maps multiple variants | Explicit per-placement mapping; no implicit generic use |
| License/brand notes change | Impact review and reapproval/block |
| Derivative job retry | Idempotent by parent/profile/version/hash |
| Publication concurrent with revoke | Revoke/version guard wins; no delivery |
| CDN/cache purge failure | Origin/project blocks authorization; retry critical alert |
| Historical quote uses revoked asset | Public image tombstone; quote data remains |

## 12. Security, privacy, performance and analytics

Uploads are isolated and least privilege; parsers/transformers sandboxed, egress denied unless required; SVG/metadata/filenames sanitized; signed intake/delivery grants scoped/short-lived. Public assets are optimized/responsive/cached by immutable revision; transforms async and deduplicated; originals not served accidentally. Analytics counts asset roles/formats/failures/blocked/missing mapping/performance without content or private source details.

## 13. Acceptance and tests

Primary: `AC-ASSET-MAP-001`, `AC-PORTFOLIO-001`, `AC-BADGE-001`, `AC-ASSET-REVOKE-001`, `AC-STANDARD-PREVIEW-001`, `AC-PRIV-001`.

Tests: signature/polyglot/bomb/malware/metadata; duplicate/hash; rights/status matrix; wrong variant/role; transform format/color/alpha/crop visual regression; badge restrictions; local-vs-partner labels; publication approval invalidation; revoke graph/cache/search/renderer/export; delete idempotency; no training/public client media; telemetry scan and performance derivatives.

## 14. Dependencies, risks and open questions

Dependencies: rights/source/catalog/content/storage/admin/sync/AI/security/performance. Open: approved partner export/media transport, exact attribution/brand guidelines, asset inventory, formats/quality profiles, retention/cache purge, reviewers and color-management tolerances. Risks: wrong SKU image, license scope drift, metadata PII, parser exploit, color degradation, hotlink, incomplete revoke and training misuse.

## 15. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined future controlled intake, provenance, quarantine, derivative profiles, mapping/publication, revoke/delete and tests without importing media. |
| 0.2.0 | 2026-08-02 | Added AMIGO image authority, Business Owner portfolio authority and explicit PostgreSQL metadata/object-storage binary separation from `OWNER-DECISION-008`; no import was asserted. |
| 0.3.0 | 2026-08-02 | Authorized controlled Phase 1B.1 pilot media intake while retaining rights/publication and later-phase gates. |
| 0.4.0 | 2026-08-03 | Added mandatory pre-import VersityGW contract gate and exact SSRF/MIME/size/dimensions/hash/dedup/item-failure requirements from `OWNER-DECISION-011`. |
