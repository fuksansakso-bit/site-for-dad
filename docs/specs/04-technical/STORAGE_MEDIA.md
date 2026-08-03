# Storage and media delivery specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1A storage port and Phase 1B.2 full-catalog media contract verified; real full intake remains a final acceptance step; production provider/region gated |
| Версия | 0.6.0 |
| Дата | 2026-08-03 |
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
- **STORAGE-SPEC-021 — MUST:** for AMIGO catalog images, PostgreSQL stores metadata copied from versioned authoritative AMIGO records, mappings, rights/publication state and opaque object references, while original/derivative bytes remain in object storage. Neither a database row nor an object alone transfers AMIGO authority or grants publication.
- **STORAGE-SPEC-022 — MUST:** the external storage contract remains provider-neutral and supports put/get/head/delete, scoped signed read/write URLs, metadata and SHA-256 validation; S3 path-style/SigV4, endpoint, region, credentials, buckets, retry/timeout and multipart settings remain adapter/configuration concerns.
- **STORAGE-SPEC-023 — MUST:** local/CI uses only digest-pinned VersityGW `v1.4.1` in a Linux Docker Compose container with a POSIX backend and separate Docker named volumes for object data, versioning and IAM. Windows object-directory bind mounts are prohibited.
- **STORAGE-SPEC-024 — MUST:** `PRIVATE`, `QUARANTINE` and `PUBLIC_DELIVERY` buckets are environment-named, private by default and provisioned by an explicit idempotent initialization command. Anonymous write/list/read and automatic request-time provisioning are prohibited; public delivery remains controlled per object.
- **STORAGE-SPEC-025 — MUST:** local S3/Admin/Web UI endpoints, when enabled, bind only to loopback; root credentials come only from environment, never enter repository/client/log/evidence, and are replaced with safe placeholders in `.env.example`.
- **STORAGE-SPEC-026 — MUST:** before real media import, the adapter contract gate verifies byte equality, SHA-256, type/length/metadata, signed read/write, deletion, multipart complete/abort, idempotency/dedup/same-key safety, limits/checksum/MIME, concurrency, unavailable/timeout/retry and named-volume persistence for the approved size matrix and real AMIGO image.
- **STORAGE-SPEC-027 — MUST:** VersityGW is a disposable local/CI adapter only. Production provider, region, encryption/key custody, retention and recovery remain gated by `TBD-INFRA-004`, `TBD-INFRA-010` and `TBD-PRIV-*` and require a future decision.
- **STORAGE-SPEC-028 — MUST:** new Phase 1B.2 AMIGO originals carry the provider-neutral `AMIGO_AUTHORIZED_CATALOG` source marker. The historical `AMIGO_CATALOG_PILOT` marker remains a valid immutable legacy value for the already imported partner bytes and MAY satisfy deduplication only when zone, SHA-256, length and MIME all match exactly; metadata is never rewritten merely to rename the phase.

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

### Phase 1B.1 local contract evidence (2026-08-03)

RustFS `1.0.0-beta.11` was removed from active local/CI configuration after Windows 11 reproduced successful 65,536/131,072-byte writes but `HTTP 500 File access denied` at 159,099/262,144 bytes and on the real-media path. VersityGW `v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f` passed 15/15 automated contract tests for `1`, `65,536`, `131,072`, `159,099`, `262,144`, `515,180`, `1,048,576`, `5,242,880` and `6,291,456` bytes. The allowlisted 515,180-byte AMIGO JPEG round-tripped byte-for-byte with SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`; signed read/write, multipart complete/abort, negative anonymous access, graceful container restart, Docker Desktop auto-recovery and named-volume persistence passed.

The completed pilot then imported 59/59 allowlisted media assets (8,340,101 bytes) for 32/32 variants and re-read every object byte-for-byte before and after a graceful full-environment restart. The controlled public route delivered all 32 primary images only from active version-pinned composition and revalidated MIME, length and SHA-256; anonymous buckets, permanent signed URLs, client credentials and hotlinks were not introduced. A CI-discovered same-key race was fixed by serializing immutable writes per endpoint/bucket/key, and the 15-case concurrency/idempotency contract plus the full 9-stage CI gate passed afterward.

## 13. Dependencies, risks and open questions

Dependencies: media/AI/data/API/security/performance/observability/deployment/evaluation and storage ADR. Open: vendor/region/residency, encryption/key, private delivery pattern, exact limits/TTLs, CDN, backup/RPO/RTO, replication, provider deletion and cost. Risks: accidental public bucket, signed URL leak, incomplete deletion, restore resurrection, broad prefix delete, prod-to-test data and egress cost.

## 14. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined storage classes, private/public upload/delivery, retention/delete/backup/restore, failures and vendor-neutral controls. |
| 0.2.0 | 2026-08-02 | Clarified `OWNER-DECISION-008` boundary between AMIGO image authority, PostgreSQL metadata and object-storage binary content. |
| 0.3.0 | 2026-08-02 | Authorized bounded Phase 1B.1 use of the provider-neutral local storage port without choosing production infrastructure. |
| 0.4.0 | 2026-08-03 | Recorded `OWNER-DECISION-011`, private VersityGW Compose/named-volume contract and passed real-image/signed/multipart/restart gate. |
| 0.5.0 | 2026-08-03 | Recorded 59-object real pilot import/public delivery, post-restart integrity, immutable same-key race regression and final CI evidence. |
| 0.6.0 | 2026-08-03 | Added the full authorized catalog object-source marker while retaining exact-integrity reuse of immutable Phase 1B.1 partner objects. |
