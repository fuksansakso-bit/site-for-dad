# Logical data model specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — logical model/invariants; no SQL or vendor types |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
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

## 2. Aggregate boundaries

| Aggregate | Root / owned entities | External references |
|---|---|---|
| Partner/Source | PartnerRelationship, SourceCatalog, SourceCapture, SourceEntity | Supplier, MediaAsset, SyncRun |
| Catalog | ProductFamily/Type/System/Model, option/property definitions, mappings/readiness | Source, Media, Price, Rules |
| Material | Material, MaterialVariant, properties/values | Catalog systems, MediaAsset, price category |
| Configuration | Configuration + immutable revisions/selections/validation | Catalog/schema/rules/material |
| Pricing | PriceVersion, PriceRule, Override, Quote/revisions/breakdown/parity case | Configuration, source context, actor |
| Preview | Scene/Profile, PreviewRevision/derivative | Configuration, MediaAsset |
| Visualization | Photo graph, geometry/masks/jobs/revisions/share/delete | Project/config/media/account/provider refs |
| Project/Cart | Project, Cart, CartItem, ownership | Configuration/quote/preview |
| Lead/Order | Handoff, Lead, Measurement, Order, WarrantyClaim, transitions | Project/customer/quote/staff |
| Identity | Account, Identity, Session, RoleAssignment, GuestOwnership | Projects/leads/audit |
| Content/Media | Content revisions, MediaAsset/original/derivative/placement/rights | Partner/catalog/project |
| Sync | SyncRun, capture refs, differences/conflicts/approvals/activation | Source/catalog/price/media |
| Audit/Job | AuditEvent, OutboxEvent, Job/attempt/dead-letter metadata | Pseudonymous aggregate refs |

Aggregates reference others by stable ID/revision and use application orchestration for cross-aggregate workflow. Direct cascade deletion across aggregates is prohibited without policy/task graph.

## 3. Common fields

Common versioned entity fields: `id`, `revision`, `status`, `createdAt/by`, `updatedAt/by`, optional effective/expiry/retired/deleted timestamps, `version`, `checksum`, `reason`, `correlationId`. Not every public DTO exposes these.

External provenance fields: `supplierId`, `sourceRecordId`, `sourceCatalogId/context`, `sourceEntityId/slug/urlOrAuthorizedRef`, `sourceVersion`, `capturedAt`, `lastVerifiedAt`, `verificationStatus`, `administrativeStatus/comment`, `evidenceReference`.

## 4. Partner and source model

`Supplier 1—N SourceCatalog`; `Supplier 1—N PartnerRelationshipRevision`; `SourceCatalog 1—N SourceCapture`; capture has source entities/raw metadata/hash; mappings connect source entity revision to one/more local entities and record mapping type/confidence/reviewer.

PartnerRelationship fields mandated by owner: `partnerStatus`, `partnerName`, `partnerRegion`, `partnerBadgeAssetId`, `permissionScope`, `permissionConfirmedByOwner`, `permissionRecordedAt`, `optionalEvidenceReference`, `brandUsageNotes`, effective/revoked state. Permission scope revision is referenced by relevant source/media publication records.

## 5. Catalog/material model

Canonical chain: Supplier → PartnerRelationship → SourceCatalog → ProductFamily → ProductType → ProductSystem → ProductModel → ProductConfiguration. ProductType optional; family and price categories dynamic.

Supporting entities: MountingType, ControlType, OptionGroup/Value, CompatibilityRule, DimensionConstraint, Material/Variant/PropertyDefinition/Value, Color/Pattern/Texture/Composition/Transparency semantics, AvailabilityRecord, PriceCategory, MediaPlacement, LocalOverride and four readiness dimensions.

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

PriceVersion owns immutable rules/category mappings/overrides/effective state/checksum/approvals. PriceRule applicability is normalized or an approved declarative expression with version. Quote stores exact input snapshot, version/rules/components/amount/currency/status/disclosure/checksum.

Historical quote does not foreign-key only to mutable current configuration or active pointer; it pins necessary revisions. Recalculation links `supersedesQuoteId` but preserves both. Source value and override remain separate.

## 8. Preview and visualization model

Standard PreviewRevision links configuration, SceneProfile, ProductRenderProfile, MaterialRenderProfile/assets and output derivative; it contains no user photo.

Private graph:

`PhotoUpload → PhotoRevision → WindowCandidate* → ConfirmedGeometry → MaskSet → VisualizationJob* → VisualizationRevision* → ShareAttachment*`; `DeletionTask` roots the graph and tracks object/job/provider cleanup. Every private entity includes owner/purpose/classification/expiry/deletion state but not direct public URL.

Coordinates normalized with original dimensions/orientation transform. Base and refined revisions are distinct; refined links base and invariant report.

## 9. Project, cart, lead and order model

Project has guest/account ownership history. Cart owns items referencing immutable configuration/quote/preview revisions and quantity. HandoffSnapshot is immutable/share-safe and has opaque ref/expiry/revocation. Lead references snapshot and minimal contact/purpose/consent. Measurement, Order and WarrantyClaim use transition records, not arbitrary status mutation.

Customer-safe order state is a mapping/projection from internal state/version; internal notes stored separately with staff permissions. External WhatsApp open is not a server-confirmed message/delivery state.

## 10. Identity and authorization model

Account, Identity, Session, RoleAssignment, GuestOwnership and WorkloadIdentity follow auth spec. Identity value/credential storage is provider/ADR specific; no raw password/token in general model. Role assignments use capability, object/business/team scope, grant/revoke/effective interval. Authorization audit uses actor ID/type and assurance metadata without credential.

## 11. Content/media model

ContentRecord → ContentRevision → Placement(s). Placement references exact MediaAsset revision and domain/content role. MediaAsset has original hash/provenance/rightsholder/basis/scope/rights/publication/attribution/retention/delete; MediaDerivative links parent, transform spec/version and hash. Usage graph supports revoke/invalidation. SourceAsset is a provenance reference and cannot be treated as delivered local object until import later phase.

## 12. Sync, audit and job model

SyncRun links source capture, previous active and candidate versions, stage timestamps/states, summary/checksum. Difference contains entity/field/relationship type, before/after refs, classification/severity, mapping/conflict/resolution/approver. ActivationCommand switches typed active pointers atomically and records rollback target.

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

Tests: ID uniqueness, optimistic concurrency, effective interval overlap, hierarchy cycles, reference integrity, readiness matrix, exact money, historical replay, source rename/split/merge, dynamic category, ownership/IDOR, private graph deletion/late job, rights revoke, active pointer rollback, event/job deduplication, audit schema redaction, backup restore revocation and migration compatibility.

## 17. Dependencies, risks and open questions

Dependencies: all domain specs, API/storage/security/deployment and ADRs. Open: physical database/storage/index/search, ID format, encryption/key strategy, PII/retention/legal schema, quantitative inventory and detailed order state. Risks: over-normalization vs opaque blobs, revision explosion, accidental cascade deletion, mutable history, enum lock-in and private data in generic metadata.

## 18. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined aggregate/entity model, version/provenance, classifications, private media graph, integrity/deletion and evolution rules. |
