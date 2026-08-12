# Asset and media pipeline specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.2 catalog intake and Phase 1D approved preview-layer publication accepted; user media/production pipeline gated |
| Версия | 0.9.0 |
| Дата | 2026-08-08 |
| Rights | [ASSET_RIGHTS_REGISTER.md](../../00-global/ASSET_RIGHTS_REGISTER.md) |
| Storage | [STORAGE_MEDIA.md](STORAGE_MEDIA.md) |

## 1. Purpose and boundaries

The pipeline registers, validates, stores, maps, reviews, publishes, revokes and deletes owner/partner media with full provenance. Phase 1D additionally registers the explicitly owner-approved photoreal AMIGO scene/product layers in a checksum-bound local manifest under `OWNER-DECISION-015`; they are provisioned/read through the same private-by-default `StoragePort` and never hotlinked at runtime. User upload and production storage remain gated.

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
- **MEDIA-PIPE-027 — MUST:** Phase 1B.2 uses the existing bounded AMIGO media transport for typed material, category, system and model references produced by the accepted discovery snapshot. It MUST NOT crawl arbitrary image links, weaken the HTTPS/path/SSRF policy, exceed sequential default load or treat a source URL as delivery.
- **MEDIA-PIPE-028 — MUST:** every source media reference maps to exactly one typed catalog target and a generated private object key. Binary identity is SHA-256; exact bytes MAY be reused across multiple mappings, while source identities, rights claims and placements remain separate. Existing Phase 1B.1 object metadata MAY be reused only after exact hash/type/length/zone/source-basis verification; new full-catalog objects use the full authorized catalog source marker.
- **MEDIA-PIPE-029 — MUST:** full media intake runs in bounded durable batches, skips and re-verifies already linked immutable objects after restart, checks operator cancellation between bounded items and continues missing work without consuming retries as ordinary pagination. Exhausted retryable transport/storage failure retries the current batch; a permanent individual source/MIME/decode failure is isolated, audited and prevents a false complete manifest.
- **MEDIA-PIPE-030 — MUST:** a database media link whose object is missing or whose stored metadata conflicts fails closed and is not silently rebound to newly fetched bytes. Repair requires exact integrity evidence; public delivery never falls back to AMIGO.
- **MEDIA-PIPE-031 — MUST:** OWNER publication preparation evaluates every typed current-run material/category/system/model source-media reference, and MAY move only its locally verified `PARTNER_LICENSE` object from `PENDING` to `PUBLICATION_APPROVED`. Content-hash reuse MAY cause several references to share one approval, but historical references remain distinct; activation still serves only media selected by the immutable active composition.

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

### Phase 1B.1 execution evidence (2026-08-03)

The bounded AMIGO transport processed only the frozen 32-ID allowlist with concurrency `1`, redirect/SSRF policy, declared and detected MIME checks, size/dimension/decompression limits, SHA-256 and generated immutable keys. It created 59 mapped `PARTNER_LICENSE` assets for 32/32 variants, preserved source URLs/original filenames only as governed metadata, recorded audit/sync events and produced zero item-level failures. Separate asset publication approval preceded active composition; the public surface uses no hotlink and exposes no source URL/object key. Recovery and no-op repeats created no duplicate assets or links, and all stored bytes were reverified after restart.

### Phase 1B.2 full intake evidence (2026-08-04)

The accepted run accounts for 3 053 typed references: 2 940 material, 12 category, 52 system and 49 model. Exact typed mappings produced 4 708 normalized media sync items and 1 655 manifests; checksum-based deduplication retained provenance while storing 2 818 distinct private objects totaling 519 671 532 bytes. All 1 655 MaterialVariant have local primary media, all 2 818 objects are `PARTNER_LICENSE` + `PUBLICATION_APPROVED`, and item-level failures/hotlinks are zero. Acceptance re-read every object by length/SHA-256 after two full restarts and confirmed that the semantic no-op repeat created no candidate/diff. Missing/conflicting object and terminal failure regressions remain fail closed before review.

### Phase 1D preview-layer evidence (2026-08-08)

The preview manifest contains 11 runtime entries: two 1500×937 photoreal scenes and exact system/material visualization layers for the four validated configuration scopes. Each entry records source URL, local file, immutable object key, SHA-256, byte length, MIME, dimensions, `PARTNER_LICENSE`, `PUBLICATION_APPROVED` and the owner-confirmed permission basis. The original Zebra 5992 source is retained locally; its runtime derivative records source hash, four source/destination quadrilateral coordinates and `PERSPECTIVE_RECTIFICATION_V1`. Provisioning writes the governed `AMIGO_AUTHORIZED_PREVIEW` source marker. Delivery rechecks marker/MIME/length/hash and exposes neither object key nor source URL.

## 14. Dependencies, risks and open questions

Dependencies: rights/source/catalog/content/storage/admin/sync/AI/security/performance. Open: official partner export/media channel, exact attribution/brand guidelines, broader swatch mappings, retention/cache purge and physical color-management tolerances. Risks: wrong SKU image, license scope drift, color degradation, hotlink, incomplete revoke and training misuse.

## 15. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined future controlled intake, provenance, quarantine, derivative profiles, mapping/publication, revoke/delete and tests without importing media. |
| 0.2.0 | 2026-08-02 | Added AMIGO image authority, Business Owner portfolio authority and explicit PostgreSQL metadata/object-storage binary separation from `OWNER-DECISION-008`; no import was asserted. |
| 0.3.0 | 2026-08-02 | Authorized controlled Phase 1B.1 pilot media intake while retaining rights/publication and later-phase gates. |
| 0.4.0 | 2026-08-03 | Added mandatory pre-import VersityGW contract gate and exact SSRF/MIME/size/dimensions/hash/dedup/item-failure requirements from `OWNER-DECISION-011`. |
| 0.5.0 | 2026-08-03 | Recorded completed 32-variant/59-asset media intake, zero failures, publication approval, no-hotlink public delivery, deduplication and restart verification. |
| 0.6.0 | 2026-08-03 | Authorized the same controlled importer for typed full-catalog material/category/system/model media with exact-target mapping, bounded continuation batches, restart verification, legacy-source compatibility and fail-closed missing-object behavior. |
| 0.7.0 | 2026-08-03 | Required OWNER publication preparation to review all typed current-run catalog media while preserving hash deduplication, reference provenance and active-composition-only delivery. |
| 0.8.0 | 2026-08-04 | Recorded accepted 3 053 typed references, 2 818 approved private objects/519 671 532 bytes, 1 655/1 655 primary mappings, zero failures/hotlinks and complete restart/no-op integrity evidence. |
| 0.9.0 | 2026-08-08 | Recorded the 11-entry preview manifest, owner-confirmed partner permission, local `StoragePort` provisioning, checksum delivery and deterministic Zebra source-derived rectification. |
