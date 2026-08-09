# Logical data model specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1A–1F implemented; additive staff/admin/CRM-contact/content schema verified |
| Версия | 0.17.0 |
| Дата | 2026-08-09 |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Glossary | [GLOSSARY.md](../../00-global/GLOSSARY.md) |

## 1. Purpose and principles

This specification defines aggregate ownership, entities, keys/revisions, relationships, classifications, retention/deletion references and compatibility. Physical schema, indexes, partitions and migration syntax belong to implementation after technology ADR.

- **DATA-SPEC-001 — MUST:** each entity has stable internal ID; external IDs/slugs/contact values are not universal primary keys.
- **DATA-SPEC-002 — MUST:** mutable business objects use revision/version and optimistic concurrency; historical references pin revisions.
- **DATA-SPEC-003 — MUST:** source capture, normalized data, local override and public projection remain distinguishable.
- **DATA-SPEC-004 — MUST:** unknown, unavailable, zero, empty and not-applicable are distinct values/states.
- **DATA-SPEC-005 — MUST:** money stores exact amount/currency and rule/version context; binary float is not canonical.
- **DATA-SPEC-006 — MUST:** timestamps use authoritative UTC instant plus business display zone/context where needed; effective intervals are explicit.
- **DATA-SPEC-007 — MUST:** PII/private media/secrets are classified and minimized; object content/secret values are not copied into generic audit/events.
- **DATA-SPEC-008 — MUST:** deletion is a graph/policy operation; foreign references cannot be orphaned or resurrect data.
- **DATA-SPEC-009 — MUST:** event/idempotency/correlation identifiers are unique and retained to prevent duplicate critical effects.
- **DATA-SPEC-010 — MUST:** physical delete is prohibited for immutable quote/version/audit evidence while retention applies; public access and identity may be revoked/pseudonymized.
- **DATA-SPEC-011 — MUST:** all enums/states are versioned contract values; dynamic source categories/labels are not database enums.
- **DATA-SPEC-012 — MUST:** every externally derived record has provenance/capture/verification/version/admin status.
- **DATA-SPEC-013 — MUST:** every catalog/price/media/business field declares an authority class and provenance. AMIGO-origin products/materials/technical data/catalog-image identity/base prices use `AMIGO_SOURCE`; availability/visibility/price override/portfolio/commercial conditions use `BUSINESS_OWNER_LOCAL`.
- **DATA-SPEC-014 — MUST:** PostgreSQL is the operational system of record for immutable source captures, normalized projections, local overlays, active pointers and audit, but persistence location MUST NOT be used to infer or change authority.
- **DATA-SPEC-015 — MUST:** sync/import cannot update a `BUSINESS_OWNER_LOCAL` field, and local mutation cannot alter an immutable `AMIGO_SOURCE` value; correction creates the appropriate new source capture, mapping revision or local overlay.
- **DATA-SPEC-016 — MUST:** catalog-image binary originals/derivatives live in managed object storage; PostgreSQL stores source/asset metadata, hash, mapping, rights/publication states and opaque object references, never a public source URL as the delivered binary.
- **DATA-SPEC-017 — MUST:** immutable `CatalogVersion` is the public-serving catalog unit. Only one approved version per declared business/context may be active; public catalog/search/filter/configurator/calculation/lead/analytics records reference that version or transactional state derived from it.
- **DATA-SPEC-018 — MUST:** `CatalogVersion` stores unique ID, `createdAt`, nullable `publishedAt`, source/source-version manifest, capture/sync/diff checksums, Business Owner approval, administrator activation, predecessor and rollback target. Published content is never edited in place.
- **DATA-SPEC-019 — MUST:** cache, search index, filter facet and analytics/read projection records carry exact `catalogVersionId`/projection version and are rebuildable from PostgreSQL. They cannot be an independent import or mutation source.
- **DATA-SPEC-020 — MUST:** source removal records a source tombstone/difference and MUST NOT cascade-delete, clear, hide or retire local entities, local-only records, `BUSINESS_OWNER_LOCAL` overlays or historical references; a later local transition is separate, authorized and audited.
- **DATA-SPEC-021 — MUST:** the composed public value resolves an applicable approved local override before the source-backed default while preserving both records. Precedence uses explicit type/scope/effective interval, never column overwrite or latest-write-wins.
- **DATA-SPEC-022 — MUST:** every catalog capture/import/validation/diff/local edit/override/approval/activation/rejection/hide/archive/rollback/projection rebuild has an append-only audit reference with actor/workload, time, reason, before/after version references and correlation ID.
- **DATA-SPEC-023 — MUST:** every source price revision targets exactly one normalized `MaterialVariant` or `ProductModel`, stores its semantic `sourceVersion` and remains append-only. A retry may reuse only an exact revision for the same `(catalogSourceId, sourceId, sourceVersion)`; `PriceVersionRecord` pins its exact immutable ID.
- **DATA-SPEC-024 — MUST:** a run manifest, diff, composition and `PriceVersion` select source prices by both the run item/hash and the run-pinned `sourceVersion`. Historical revisions with an equal hash cannot be joined as current, and no source-price operation mutates `LocalPriceOverride`.
- **DATA-SPEC-025 — MUST:** each catalog/price difference review persists as an append-only `CatalogDifferenceReviewBatch` referencing exactly one candidate version, its sync run, expected difference checksum, selection mode/IDs/checksum, resolution, affected count, actor, safe reason, correlation and idempotency key. Review history cannot be updated or deleted, and candidate approval is derived only from matching evidence plus the current explicit resolutions.
- **DATA-SPEC-026 — MUST:** each successful local-overlay bulk apply persists one append-only `CatalogBulkCommand` bound to catalog source, sync run and mutable candidate version. It stores selector mode/payload, requested patch, exact affected business-entry IDs, per-target before/after snapshots, matched/affected counts, selection/request/expected-difference checksums, actor, safe reason, correlation and unique idempotency key; failed validation inserts neither command nor partial overlay changes.
- **DATA-SPEC-027 — MUST:** `MaterialVariant.sourceEntityId` and its source namespace form the stable unique identity. `(materialId, article)` is indexed but non-unique because real authorized source evidence contains distinct variants sharing an article; normalization MUST preserve every source ID and MUST NOT merge or discard those rows.
- **DATA-SPEC-028 — MUST:** a material-media placement is unique by `(materialVariantId, assetRole, sortOrder)`. When a parser or mapping revision gives the current source media reference a new identity for that same semantic placement, import MUST atomically rebind the placement to the current `SourceMediaAsset`, preserve historical source entities/snapshots, and keep binary deduplication hash-based; it MUST NOT create two placements for one semantic slot.

## 2. Aggregate boundaries

| Aggregate | Root / owned entities | External references |
|---|---|---|
| Partner/Source | PartnerRelationship, SourceCatalog, SourceCapture, SourceEntity | Supplier, MediaAsset, SyncRun |
| Catalog | CatalogVersion/active pointer, ProductFamily/Type/System/Model, option/property definitions, mappings/readiness, local overlays | Source, Media, Price, Rules, derived projections |
| Material | Material, MaterialVariant, properties/values | Catalog systems, MediaAsset, price category |
| Configuration | Configuration + immutable revisions/selections/validation | Catalog/schema/rules/material |
| Pricing | PriceVersion, PriceRule, Override, Quote/revisions/breakdown/parity case | Configuration, source context, actor |
| Preview | `StandardPreviewState`, Scene/Profile and checksum-bound render assets | PricingCalculation/QuoteSnapshot, Configuration, MediaAsset |
| Visualization | Photo graph, geometry/masks/jobs/revisions/share/delete | Project/config/media/account/provider refs |
| Project/Cart | Project, Cart, CartItem, ownership | Configuration/quote/preview |
| Lead/Order | Handoff, Lead, Measurement, Order, WarrantyClaim, transitions | Project/customer/quote/staff |
| Identity | Account, Identity, Session, RoleAssignment, GuestOwnership | Projects/leads/audit |
| Content/Media | Content revisions, MediaAsset/original/derivative/placement/rights | Partner/catalog/project |
| Sync | SyncRun, capture refs, differences/conflicts/approvals/activation | Source/catalog/price/media |
| Audit/Job | AuditEvent, OutboxEvent, Job/attempt/dead-letter metadata | Pseudonymous aggregate refs |

Aggregates reference others by stable ID/revision and use application orchestration for cross-aggregate workflow. Direct cascade deletion across aggregates is prohibited without policy/task graph.

## 3. Common fields

Common versioned entity fields: `id`, `revision`, `status`, `createdAt/by`, `updatedAt/by`, optional effective/expiry/retired/deleted timestamps, `version`, `checksum`, `reason`, `correlationId`. Published catalog versions additionally require `publishedAt`, source manifest, approval/activation references, predecessor and rollback target. Not every public DTO exposes these.

External provenance fields: `supplierId`, `sourceRecordId`, `sourceCatalogId/context`, `sourceEntityId/slug/urlOrAuthorizedRef`, `sourceVersion`, `capturedAt`, `lastVerifiedAt`, `verificationStatus`, `administrativeStatus/comment`, `evidenceReference`.

## 4. Partner and source model

`Supplier 1—N SourceCatalog`; `Supplier 1—N PartnerRelationshipRevision`; `SourceCatalog 1—N SourceCapture`; capture has source entities/raw metadata/hash; mappings connect source entity revision to one/more local entities and record mapping type/confidence/reviewer. Source capture values carry `authority = AMIGO_SOURCE`; normalization does not transfer ownership to the local mapper. A source removal creates a versioned source tombstone/difference and has no cascade path to local overlays, local-only entities or historical facts.

PartnerRelationship fields mandated by owner: `partnerStatus`, `partnerName`, `partnerRegion`, `partnerBadgeAssetId`, `permissionScope`, `permissionConfirmedByOwner`, `permissionRecordedAt`, `optionalEvidenceReference`, `brandUsageNotes`, effective/revoked state. Permission scope revision is referenced by relevant source/media publication records.

## 5. Catalog/material model

Canonical chain: Supplier → PartnerRelationship → SourceCatalog → ProductFamily → ProductType → ProductSystem → ProductModel → ProductConfiguration. ProductType optional; family and price categories dynamic.

`CatalogVersion` is an immutable manifest of exact normalized catalog entity revisions, source capture/source-version references, applicable Business Owner overlays/readiness/publication decisions, compatible price/media references, validation/diff evidence and approval/activation metadata. `ActiveCatalogPointer` selects one approved version per business/context atomically and retains the previous/rollback target. Search, filter, configurator, calculation, lead and analytics/read records pin `catalogVersionId`; public request handling never resolves catalog facts from AMIGO or staging.

Supporting entities: MountingType, ControlType, OptionGroup/Value, CompatibilityRule, DimensionConstraint, Material/Variant/PropertyDefinition/Value, Color/Pattern/Texture/Composition/Transparency semantics, AvailabilityRecord, PriceCategory, MediaPlacement, LocalOverride and four readiness dimensions. Availability/publication/override/portfolio/commercial records carry `authority = BUSINESS_OWNER_LOCAL`, decision evidence and actor/audit references. The resolved public projection records both selected source revision and selected local override revision; precedence never destroys either layer.

Relationships:

- family contains types/systems; system contains models and supported schemas;
- material can have many variants and property values; variant maps exact source identifiers/assets;
- system/model/material/mounting/option connect through versioned compatibility rules rather than array blobs;
- readiness is versioned per local entity and dimension;
- source price category is `(sourceCatalog/context/version, categoryString)` and links relevant variants/rules.

## 6. Configuration and validation model

Configuration root identifies owner/project and current revision. Revision stores catalog/schema/rule version refs and normalized selection records (`fieldPath`, typed value, source/default/user provenance). Raw dimension input is retained only where needed for explanation, normalized value separately.

ValidationRun stores configuration revision, rule versions, per-rule outcomes/codes/field paths/messages and aggregate `VALID/INVALID/MANUAL_REVIEW`. Quote/preview/cart reference a `VALID` revision except explicitly allowed manual states.

## 7. Pricing model

`SourcePriceRecord` stores immutable AMIGO-origin material/model card/base/price-from facts in integer minor units with currency, status, dynamic source category, context, provenance dates/hash and semantic source version. `PRICE_ON_REQUEST` has a null amount and never zero. `PriceVersion` owns an immutable manifest and exact `PriceVersionRecord` links; local overrides remain separate audited business records. Future PriceRule applicability is normalized or an approved declarative expression with version. Quote stores exact input snapshot, version/rules/components/amount/currency/status/disclosure/checksum.

Historical quote does not foreign-key only to mutable current configuration or active pointer; it pins necessary revisions. Recalculation links `supersedesQuoteId` but preserves both. Source value and override remain separate.

## 8. Preview and visualization model

`StandardPreviewState` has an opaque 32-character ID, owner key hash, state/renderer version, pricing-calculation or immutable quote reference, scene, canonical family/material/asset-quality snapshot, bounded controls/family parameters/hardware, state checksum, correlation ID and timestamps. It is mutable working state stored separately from immutable `PricingCalculation`/`QuoteSnapshot`; update revalidates ownership and compatibility, delete removes only the guest preview state, and it contains no user photo or rendered customer image.

Private graph:

`PhotoUpload → PhotoRevision → WindowCandidate* → ConfirmedGeometry → MaskSet → VisualizationJob* → VisualizationRevision* → ShareAttachment*`; `DeletionTask` roots the graph and tracks object/job/provider cleanup. Every private entity includes owner/purpose/classification/expiry/deletion state but not direct public URL.

Coordinates normalized with original dimensions/orientation transform. Base and refined revisions are distinct; refined links base and invariant report.

## 9. Project, cart, lead and order model

`GuestCartSession` stores a random-token hash, expiry and revocation; `GuestCart` stores status/revision and owns ordered `CartItem` rows. Every item points to an immutable `QuoteSnapshot`, optional owned preview and append-only `CartItemRevision`; edit changes the pointer only after a new quote exists.

`OrderInquiry` is the Phase 1E request aggregate. It stores a safe request number, guest/cart, normalized contact and consent, measurement/installment flags, status/version, immutable cart JSON, known subtotal/pricing status, catalog/price version sets, source/correlation/audit context and a revocable hashed public reference. `RequestItemSnapshot` pins item/quote/preview bytes; `RequestCommunicationEvent` and `RequestInternalNote` are separate append-only evidence. Measurement scheduling, confirmed `Order` and `WarrantyClaim` remain future transition aggregates.

Customer-safe order state is a mapping/projection from internal state/version; internal notes stored separately with staff permissions. External WhatsApp open is not a server-confirmed message/delivery state.

## 10. Identity and authorization model

Account, Identity, Session, RoleAssignment, GuestOwnership and WorkloadIdentity follow auth spec. Identity value/credential storage is provider/ADR specific; no raw password/token in general model. Role assignments use capability, object/business/team scope, grant/revoke/effective interval. Authorization audit uses actor ID/type and assurance metadata without credential.

## 11. Content/media model

ContentRecord → ContentRevision → Placement(s). Placement references exact MediaAsset revision and domain/content role. MediaAsset has original hash/provenance/rightsholder/basis/scope/rights/publication/attribution/retention/delete and opaque object reference; MediaDerivative links parent, transform spec/version and hash. Usage graph supports revoke/invalidation. SourceAsset is an AMIGO-authoritative provenance reference and cannot be treated as delivered local object until controlled import to object storage in a later phase. PostgreSQL stores metadata/relationships, not the binary as a catalog column.

## 12. Sync, audit and job model

SyncRun links source capture, previous active and candidate `CatalogVersion`, stage timestamps/states, summary/checksum. Difference contains entity/field/relationship type, before/after refs, classification/severity, mapping/conflict/resolution/approver. BusinessOwnerApproval binds the exact candidate/diff checksum. ActivationCommand requires that approval plus an actor with publication activation capability, switches the `ActiveCatalogPointer` atomically and records predecessor/rollback target. RebuildProjectionCommand carries the activated catalog version and cannot read source/staging independently.

AuditEvent: immutable ID/time/actor/capability/aggregate ID/type/from-to version/state/reason/result/correlation/causation plus redacted metadata schema. OutboxEvent: event type/schema/payload safe refs/status/attempt. Job stores safe refs/stage/attempt/cancel/delete flags; detailed private content stays object/domain store.

## 13. Data classification matrix

| Class | Examples | Public/cache/log rules |
|---|---|---|
| `PUBLIC_APPROVED` | Published catalog/content/derivatives | Public cache by revision; revoke/invalidate |
| `INTERNAL_BUSINESS` | Source mappings, price rules, admin notes | Staff scope; redacted telemetry |
| `CONTACT_PII` | Name/phone/address/lead | Purpose/assignment/retention; no analytics raw |
| `PRIVATE_USER_MEDIA` | Photos/masks/outputs/coordinates | Private object; short-lived access; no logs/training |
| `AUTH_SECRET` | Tokens/codes/credentials | Secret store/hash; never client/log/export |
| `AUDIT_EVIDENCE` | Mutations/approvals | Immutable/minimized/restricted/retained policy |
| `PARTNER_CONFIDENTIAL` | Credentials/non-public export/rules | Minimum adapter/operator scope |

## 14. Integrity and deletion invariants

- source/price/content/media revisions checksum-verified;
- active pointer references approved compatible revision;
- public/derived catalog record references the exact active `catalogVersionId`; no AMIGO/staging reference is a public serving source;
- source removal has no automatic local delete/hide/archive cascade;
- override resolution preserves source and overlay revisions and follows declared precedence;
- no orphan derivative/placement/cart item/quote rule ref;
- no public asset without valid rights/publication/usage mapping;
- no private access after deletion/revoke even if object physical cleanup pending;
- late jobs/callbacks check deletion/owner/current state before commit;
- backup restore reapplies deletion/revocation ledger before exposure;
- contact/account deletion retains only classified exceptions and pseudonymizes links;
- audit/event payload schemas reject secret/private fields.

## 15. Compatibility and migrations

Schema changes use additive/read-old-write-new/dual-compatible evolution, backfill verification, cutover and rollback/compensation. Field/state/API/event removal needs impact analysis and version. Dynamic source categories stay data. Historical readers must interpret pinned schema/rule versions or retain normalized snapshot.

## 16. Validation, errors and tests

Tests: ID uniqueness, optimistic concurrency, effective interval overlap, hierarchy cycles, reference integrity, readiness matrix, exact money, historical replay, source rename/split/merge/removal, preservation of local data/overlays on removal, dynamic category, catalog-version source/timestamp/approval completeness, single active pointer, public/derived version pinning, override precedence without source mutation, ownership/IDOR, private graph deletion/late job, rights revoke, active pointer rollback, event/job deduplication, catalog-change audit coverage, audit schema redaction, backup restore revocation and migration compatibility.

## 17. Physical schema record through Phase 1F

The seven Phase 1A identity/audit/delivery tables and fifteen Phase 1B.1/1B.2 catalog migrations remain compatible. Migration `20260808150000_phase_1c_configurator_pricing` adds five bounded aggregates without changing the active catalog composition:

| Aggregate | Stored evidence and immutability |
|---|---|
| `PricingRule` | PriceVersion-scoped applicability, integer rule payload, source/version/verification/envelope/parity metadata; indexed by version and configuration identity |
| `PricingParityRun` | Immutable fixture count, maximum deviation and report for an exact candidate/version |
| `PricingCalculation` | Idempotent authoritative input/result snapshot and correlation for server calculation |
| `QuoteSnapshot` | Opaque public token plus immutable selected labels/articles, dimensions/options/breakdown/version/override/minimum/status snapshot |
| `PricingVersionDecision` | Append-only activation/rejection actor, reason, parity and correlation evidence |

Append-only database triggers prevent update/delete of rules, parity runs, calculations, quote snapshots and decisions. Existing `LocalPriceOverride` remains a separate Business Owner layer and is referenced in calculation/quote snapshots without mutating AMIGO source facts. Transactional activation maintains one active reviewed pricing version; indexes cover active/version/configuration lookup and public quote-token lookup.

Migration `20260808190000_phase_1d_standard_preview` adds guest-owned preview state. Phase 1E migrations `20260809113000_phase_1e_cart_request_intake`, `20260809114500_phase_1e_cart_money_bigint`, `20260809121000_phase_1e_communication_idempotency` and `20260809124500_phase_1e_request_admin_controls` add the following bounded records without creating an `Order`:

| Aggregate | Stored evidence and integrity |
|---|---|
| `GuestCartSession` / `GuestCart` | hashed owner token, expiry/revocation, active/checked-out state and optimistic revision |
| `CartItem` / `CartItemRevision` | immutable quote/optional preview pointers plus append-only add/replace/duplicate/remove evidence |
| `OrderInquiry` / `RequestItemSnapshot` | immutable checkout composition, BigInt known money, statuses/version sets, consent/source/correlation and hashed/revocable public reference |
| `RequestCommunicationEvent` / `RequestInternalNote` | allowlisted truthful events with idempotency and staff-attributed internal notes |

Database triggers reject update/delete of request item snapshots and protected request composition/money/version/reference fields. Audit/outbox writes share the checkout/status transaction. There is no payment, credit, account, confirmed-order, client-photo/AI or production-provider schema.

## 18. Dependencies, risks and open questions

Dependencies: all domain specs, API/storage/security/deployment, ADRs and `OWNER-DECISION-008/009/010/012/013/014/015/016/017/018`. PostgreSQL/Prisma remains fixed; approved preview and portfolio bytes stay behind `StoragePort`. Production PII/legal/retention, customer accounts/full order workflow, production storage/index/search and Phase 1G+ remain gated. Risks: accidental ownership bypass, stale version references, mutable quote history, projection drift and private data in generic metadata.

## 19. Phase 1F physical additions

- **P1F-DATA-001 — SUPERSEDED:** account/project/favorite/ownership tables are withdrawn before acceptance by `OWNER-DECISION-018`; staff identity/session/invitation, portfolio and SiteSettings remain additive.
- **P1F-DATA-002 — MUST:** existing ActorIdentity/RoleGrant remains the staff RBAC subject; staff-invitation lifecycle references it rather than duplicating role authority. `CustomerContact` is deliberately not an ActorIdentity.
- **P1F-DATA-003 — SUPERSEDED:** no account ownership links are added to QuoteSnapshot, StandardPreviewState or OrderInquiry in Phase 1F; immutable Phase 1E records remain unchanged.
- **P1F-DATA-004 — MUST:** e-mail, contact and profile data is never placed in AuditEvent target/reason fields, Outbox payloads, object keys or public references.
- **P1F-DATA-005 — MUST:** portfolio original/derivative records store checksum, MIME, dimensions, safe name, rights/publication state and StoragePort reference; no client-photo class is accepted by this aggregate.
- **P1F-DATA-006 — MUST:** SiteSettings revisions preserve effective value, author, reason, timestamp and rollback lineage; one active pointer is selected transactionally.
- **P1F-DATA-007 — MUST:** `CustomerContact` stores normalized supplied phone, optional normalized e-mail, bounded display name/locality and created/updated timestamps without password, OTP, session or ActorIdentity linkage.
- **P1F-DATA-008 — MUST:** a link table associates immutable `OrderInquiry` records with `CustomerContact`; deterministic deduplication and merge/conflict handling never mutate captured request contact snapshots.
- **P1F-DATA-009 — MUST:** internal notes reference request or contact, staff ActorIdentity, bounded text and timestamps and are never copied to a public/request snapshot.
- **P1F-DATA-010 — MUST:** only staff sessions may be persisted by Phase 1F runtime; the CUSTOMER role may remain reserved but has no authentication/session creation path.

## 20. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined aggregate/entity model, version/provenance, classifications, private media graph, integrity/deletion and evolution rules. |
| 0.2.0 | 2026-08-02 | Recorded the seven-table Phase 1A infrastructure schema and confirmed that logical business aggregates were not implemented. |
| 0.3.0 | 2026-08-02 | Added field authority classes, PostgreSQL operational-system semantics and object-storage image binary boundary from `OWNER-DECISION-008`; physical business schema remains unimplemented. |
| 0.4.0 | 2026-08-02 | Added `OWNER-DECISION-009` immutable `CatalogVersion`, active pointer, source/timestamp/approval/audit metadata, no-auto-delete, local-override precedence and version-pinned public/derived read semantics without creating business tables. |
| 0.5.0 | 2026-08-03 | Recorded the implemented Phase 1B.1 source/normalized/business-overlay, immutable catalog/price version and managed media-reference schema. |
| 0.6.0 | 2026-08-03 | Recorded Phase 1B.2 resumable import/media schema and exact material/model source-price revisions pinned by semantic source version without calculator or Phase 1C aggregates. |
| 0.7.0 | 2026-08-03 | Added the append-only exact-candidate catalog/price difference-review batch schema and recorded source-bound atomic activation/rollback evidence without expanding into bulk controls or Phase 1C aggregates. |
| 0.8.0 | 2026-08-03 | Added append-only exact-target `CatalogBulkCommand` evidence for atomic local-overlay category/filter/selection changes, including checksums and per-target before/after state, without source-price or Phase 1C aggregates. |
| 0.9.0 | 2026-08-03 | Replaced the disproved material/article uniqueness assumption with indexed non-unique article facts and source-entity identity, plus a forward pilot-to-full schema compatibility path. |
| 0.10.0 | 2026-08-03 | Added semantic material-media placement rebinding to the current source reference while retaining historical source evidence and checksum-based binary deduplication. |
| 0.11.0 | 2026-08-04 | Recorded accepted fifteen-migration Phase 1B.2 schema, pilot compatibility fixes, non-unique article identity, active v2 composition/price/media evidence and final migration/recovery verification without later-phase aggregates. |
| 0.12.0 | 2026-08-08 | Recorded the additive Phase 1C pricing-rule/parity/calculation/immutable-quote/version-decision schema, append-only triggers, lookup indexes and preserved Phase 1B.2 data/volumes without Phase 1D aggregates. |
| 0.13.0 | 2026-08-08 | Recorded the separate ownership-scoped `StandardPreviewState`, opaque lookup/indexes, immutable calculation/quote references and no-customer-photo boundary delivered in Phase 1D. |
| 0.14.0 | 2026-08-09 | Recorded Phase 1D preview plus the additive Phase 1E guest cart, item revision, immutable `OrderInquiry`/item snapshot, communication/note, BigInt money and database immutability controls. |
| 0.15.0 | 2026-08-09 | Authorized additive Phase 1F identity/account/project/favorite/ownership, staff invite, portfolio and SiteSettings records while preserving immutable Phase 1C–1E snapshots. |
| 0.16.0 | 2026-08-09 | `OWNER-DECISION-018` removes customer account/project/favorite/ownership records and adds request-derived CustomerContact/link/note records; staff identity/session/invite, portfolio and SiteSettings remain. |
| 0.17.0 | 2026-08-09 | Recorded the verified 25-migration Phase 1F schema, forward Prisma alignment, staff OTP/session/invitation, credential-free CustomerContact links/notes, portfolio and SiteSettings with empty/repeat/upgrade/drift/recovery evidence. |
