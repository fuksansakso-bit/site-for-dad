# Storage and media delivery specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — logical storage contract; vendor/region/RPO/RTO/retention pending ADR/TBD |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Media pipeline | [ASSET_MEDIA_PIPELINE.md](ASSET_MEDIA_PIPELINE.md) |
| Privacy/security | [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md) |

## 1. Purpose and boundaries

This specification separates public approved media, private user media, quarantine, originals, derivatives, backups and delivery authorization. It does not select object store/CDN/cloud, create buckets or define production configuration.

## 2. Storage classes and trust zones

| Class/namespace | Contents | Access |
|---|---|---|
| `quarantine` | Unvalidated uploads/import candidates | Isolated intake/scanner only; no public/app render |
| `partner-original` | Authorized immutable partner originals | Content/media workers and rights staff only |
| `owner-original` | Local owner-created originals | Content/media workers and scoped staff |
| `public-derivative` | Publication-approved catalog/content/scene outputs | Public delivery by immutable revision; revoke capable |
| `private-upload` | Client original/normalized photo | Owner-purpose/AI job only; never public CDN |
| `private-derived` | Thumbnail/mask/intermediate/base/refined | Owner-purpose/job; short-lived grants |
| `standard-preview` | Non-private deterministic outputs | Public/project policy by revisions; no client photo |
| `audit-evidence` | Restricted manifests/checksums/reports | Authorized auditor/service; immutable/minimized |
| `backup` | Encrypted recoverable snapshots by class | Recovery role/process only; deletion ledger applied |

Logical classes MAY map to separate buckets/accounts/projects/keys according to security evaluation; public and private media MUST not share a permissive public boundary.

## 3. Нормативные requirements

- **STORAGE-SPEC-001 — MUST:** private user media is never stored in a publicly readable bucket, public CDN origin or repository.
- **STORAGE-SPEC-002 — MUST:** object key is random/opaque and not authorization; access checks actor/purpose/object/state and uses short-lived grant/proxy.
- **STORAGE-SPEC-003 — MUST:** public delivery reads only a publication projection/allowlisted derivative and cannot address arbitrary original/private object.
- **STORAGE-SPEC-004 — MUST:** originals are immutable and integrity-checked by hash; derivatives have parent/profile/version/hash metadata.
- **STORAGE-SPEC-005 — MUST:** database/domain record is the source of authorization/status/relationship; object metadata alone is insufficient.
- **STORAGE-SPEC-006 — MUST:** upload initiation/complete is scoped to exact owner/purpose/size/type/key; completion verifies existence/hash/metadata and transitions state.
- **STORAGE-SPEC-007 — MUST:** server/workers use least-privilege credentials per namespace/action/environment; public clients receive no storage credentials.
- **STORAGE-SPEC-008 — MUST:** encryption in transit and at rest, key/access logging/rotation/revocation and secret management are required; exact KMS/vendor TBD.
- **STORAGE-SPEC-009 — MUST:** object URLs/keys, client media and sensitive metadata are excluded from logs/analytics/errors/support payloads.
- **STORAGE-SPEC-010 — MUST:** public/private response headers and caching differ; private content is not shared-cacheable and public cache keys are immutable revision based.
- **STORAGE-SPEC-011 — MUST:** revoke/deletion blocks authorization/origin delivery immediately before asynchronous purge/physical cleanup.
- **STORAGE-SPEC-012 — MUST:** deletion traverses exact object graph and namespaces idempotently; broad prefix deletion requires resolved validated manifest and approval.
- **STORAGE-SPEC-013 — MUST:** late upload/job/provider callback cannot recreate or expose object after deletion/revocation ledger state.
- **STORAGE-SPEC-014 — MUST:** backups include necessary integrity/version data but reapply deletions/revocations before restore exposure and honor approved retention.
- **STORAGE-SPEC-015 — MUST:** replication/region/residency/subprocessor selection follows privacy/legal/network evaluation and is documented by ADR.
- **STORAGE-SPEC-016 — MUST:** storage unavailability degrades catalog/visualizer safely without data corruption, hotlink fallback or fake success.
- **STORAGE-SPEC-017 — MUST:** quotas/rate/size/count/lifecycle policies prevent abuse/cost explosion and return typed recoverable errors.
- **STORAGE-SPEC-018 — MUST:** production assets/user photos never enter test/dev; synthetic/rights-cleared fixtures use separated namespaces/accounts.
- **STORAGE-SPEC-019 — MUST:** repository and build artifacts exclude storage dumps, credentials, signed URLs, AMIGO media and user uploads.
- **STORAGE-SPEC-020 — MUST:** restore/export/migration has integrity checks, counts/checksums, dry run, rollback/exit path and audit.

## 4. Object record and key strategy

Domain media record stores asset/object ID, namespace/classification, object version/ref (not public URL), hash/size/MIME/dimensions, encryption/key metadata safe, owner/purpose/domain mapping, rights/publication/deletion state, parent/profile, created/expiry/deleted and storage adapter/version.

Conceptual key may include environment/class/random ID/revision but must not contain customer name/phone/address, source secret, original filename or predictable account/order ID. Exact key is generated server-side and validated against approved target root.

## 5. Upload protocol

1. Authorized actor requests upload for a known purpose/resource.
2. Application validates policy, quota, declared type/size and creates `PENDING` record/key/grant with expiry.
3. Client uploads directly or through controlled proxy; grant permits one key/action/bounds only.
4. Completion command proves upload ID and expected metadata; server/head/stream verifies actual object/hash/signature.
5. Object remains quarantine/private pending scan/normalization; record becomes validated/rejected.
6. Abandoned/expired multipart/temp objects are cleaned by lifecycle job with audit/metrics.

Client-supplied filename/MIME/metadata are untrusted display hints only and sanitized.

## 6. Delivery protocol

### Public approved

Public route resolves content/catalog placement → publication projection → immutable derivative/object. CDN/cache may serve by revision with long immutable caching; revoke updates origin authorization/manifest and purges/versions URLs. Original/source object is never implied public.

### Private

Authenticated/guest owner requests delivery for exact project/purpose/revision. Application verifies ownership/state/expiry and returns short-lived single-object grant or streams content. Referrer/download/cache/content-disposition headers follow privacy. Sharing uses app-level opaque `ShareAttachment`, not storage URL.

### Staff

Default admin lists show metadata/approved thumbnail only. Access to customer private media is denied unless a separately approved support capability/purpose exists and is audited.

## 7. Retention and lifecycle

Lifecycle is data-class and state specific: quarantine rejected/temp, partner/owner originals, public derivatives, client originals/masks/outputs/shares, audit evidence and backups. Exact durations are `TBD-ASSET-RETENTION-001`, `TBD-PRIV-*` and legal decisions; no indefinite/zero value is invented.

Expiry marks access denied and queues deletion. Legal/rights hold, if future, is explicit and scoped; it cannot broadly preserve all private media. Backup deletion/compaction evidence is part of completion status.

## 8. Deletion and revoke algorithm

Conceptual sequence:

1. authorize/record request and exact graph roots;
2. transactionally set `ACCESS_REVOKED/DELETION_PENDING`, revoke grants/shares and set deletion ledger tombstone;
3. cancel/publish deletion signal to jobs/providers;
4. enumerate exact current object versions/derivatives/replicas/temp/multipart/cache keys;
5. delete/idempotently confirm each; reject late writes via tombstone/state;
6. handle backup/provider retention tasks;
7. mark complete/partial, retain minimal audit and alert retry failures.

No user-visible success claims physical completion until policy-defined scope is verified; immediate access revocation is reported separately.

## 9. Backup, restore and disaster recovery

Backup scope/classification/encryption/access/retention and RPO/RTO remain TBD. Restore occurs into isolated target, verifies checksums/counts/version compatibility, replays deletion/revocation ledger and publication/active pointers, tests application invariants, then controlled cutover. Restore must not republish revoked assets, resurrect deleted photos or activate stale price/catalog versions.

Media store inventory manifests support reconciliation without listing/outputting sensitive keys broadly. Restore drills and evidence are required before release.

## 10. Errors, edge cases and failure behavior

| Case | Safe handling |
|---|---|
| Grant expired/wrong key/type/size | Reject/abort, clean temp; no broader permission |
| Client claims success but object missing/partial | Completion fails; quarantine cleanup |
| Duplicate hash/upload retry | Idempotent record/result; rights/owner not inferred from hash |
| Object exists without DB record | Quarantine/orphan reconciliation; never public |
| DB record exists/object missing | Block delivery/processing, repair alert; no source hotlink |
| Storage/CDN outage | Text/catalog/manual path; retry; no fake preview |
| Purge failure | Origin/manifest blocks; critical retry/alert |
| Delete during multipart/job | Revoke/cancel/tombstone; late completion discarded |
| Restore before deletion ledger | Block exposure until ledger/version applied |
| Cross-environment key/ref | Deny and security alert; no prod data in test |
| Hash mismatch/corruption | Quarantine/restore verified copy; never serve |

## 11. Security, privacy, performance and observability

Threats: bucket ACL/public-policy drift, IDOR/signed URL leak, key traversal/prefix error, malicious file/parser, credential/egress abuse, metadata leakage, orphan/multipart cost, cache after revoke and backup exposure. Controls include policy-as-code/equivalent checks after implementation, least privilege, encryption, private endpoints where chosen, short grants, origin authorization, integrity, isolation and audit.

Performance: local regional testing, responsive derivatives, direct bounded upload, multipart only after threshold decision, cache public immutable media, async transforms and queue/backpressure. Metrics: bytes/count by class/format, grant/complete/failure, storage/egress latency/errors/cost, orphan/temp, cache hit/purge, deletion age/failure, integrity and backup/restore—all without object URLs/PII.

## 12. Acceptance and tests

Primary: `AC-ASSET-MAP-001`, `AC-ASSET-REVOKE-001`, `AC-AI-UPLOAD-001`, `AC-VIS-DELETE-001`, `AC-PRIV-001`, `AC-SEC-001`.

Tests: bucket/policy public exposure negative; upload grant scope/type/size/replay/expiry; hash/MIME/polyglot; cross-owner/environment; private cache/referrer/log scan; public projection only; revoke/purge/origin; delete during every stage/late callback/backup; orphan reconciliation; storage/CDN/DB partial failures; restore deletion ledger; quota/cost/large files and migration dry run.

## 13. Dependencies, risks and open questions

Dependencies: media/AI/data/API/security/performance/observability/deployment/evaluation and storage ADR. Open: vendor/region/residency, encryption/key, private delivery pattern, exact limits/TTLs, CDN, backup/RPO/RTO, replication, provider deletion and cost. Risks: accidental public bucket, signed URL leak, incomplete deletion, restore resurrection, broad prefix delete, prod-to-test data and egress cost.

## 14. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined storage classes, private/public upload/delivery, retention/delete/backup/restore, failures and vendor-neutral controls. |
