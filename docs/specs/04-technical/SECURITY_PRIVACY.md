# Security and privacy specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 0C `READY_WITH_NON_BLOCKING_TBD` for synthetic Foundation; public PII/media/AI activation remains blocked by exact legal, retention and provider values |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Data model | [DATA_MODEL.md](DATA_MODEL.md) |
| Roles | [ROLES_PERMISSIONS.md](../01-product/ROLES_PERMISSIONS.md) |

## 1. Purpose and scope

This specification covers threat boundaries, identity/authorization, input/upload/API/web security, secrets, private media/AI/providers, logging/audit, privacy inventory/purpose/consent/retention/deletion, incidents and verification. It is not legal advice and does not invent legal basis, retention periods or provider contracts.

## 2. Security and privacy principles

- **SEC-PRIV-001 — MUST:** deny by default, least privilege, object/transition authorization and separation of duties apply to users/services/providers.
- **SEC-PRIV-002 — MUST:** security/privacy requirements are server/domain/storage controls, not UI conventions.
- **SEC-PRIV-003 — MUST:** collect/process/share/store only data needed for explicit purpose and approved basis/notice/consent.
- **SEC-PRIV-004 — MUST:** private client photos and derivatives never enter public storage/CDN/repository/logs/analytics/test/training by default.
- **SEC-PRIV-005 — MUST:** all external processors/transports have approved scope, contract/policy, region/subprocessors, security/retention/deletion/incident and exit review.
- **SEC-PRIV-006 — MUST:** secrets/credentials/tokens/signed URLs are stored/transported/redacted separately and never hardcoded or exposed to client/support.
- **SEC-PRIV-007 — MUST:** every critical mutation/access has immutable minimized audit; audit itself is protected and non-editable by product actors.
- **SEC-PRIV-008 — MUST:** validation, encoding, prepared/typed persistence, CSRF/XSS/SSRF/file/parser defenses and security headers are required after stack selection.
- **SEC-PRIV-009 — MUST:** cryptography/auth/session mechanisms use established standards selected/reviewed through ADR; custom crypto/auth is prohibited.
- **SEC-PRIV-010 — MUST:** rate/resource/abuse controls cover public APIs, contact, auth, uploads, pricing, AI and admin/export without blocking accessible legitimate use arbitrarily.
- **SEC-PRIV-011 — MUST:** deletion/revocation access stops immediately and graph/provider/backup cleanup is idempotent/evidenced.
- **SEC-PRIV-012 — MUST:** security/privacy failures fail closed for private/high-risk action while preserving safe public/manual product path.
- **SEC-PRIV-013 — MUST:** production data is excluded from dev/test/demo; fixtures are synthetic or rights-cleared and non-sensitive.
- **SEC-PRIV-014 — MUST:** vulnerability/incident handling has severity, owner, containment, evidence protection, notification/legal decision and regression control.
- **SEC-PRIV-015 — MUST:** no claim of compliance/security/consent completeness is made until legal/security review and tests are recorded.

## 3. Trust boundaries and assets

Trust zones: unauthenticated browser, customer session/guest token, privileged staff browser, public edge/API, application/domain, transactional/search/cache, public media delivery, private media storage, worker/job queues, secret/config plane, AMIGO partner transport, AI/provider, WhatsApp/messaging, analytics/observability and backup/operations.

Protected assets: partner credentials/data scope, catalog/price versions/rules, staff roles/sessions, customer contact/address/order, photos/masks/outputs/coordinates, media rights evidence, audit/backup, source code/dependencies/config and operational availability/cost.

## 4. Threat model

| Threat | Example | Required controls/tests |
|---|---|---|
| IDOR/BOLA | Guess project/photo/order/admin ID | Opaque ID + object ownership/capability; cross-user matrix |
| Role/approval bypass | Admin activates own price or publishes blocked asset | Explicit capabilities/current state/separation/audit |
| Session/auth abuse | Enumeration, fixation, replay, stuffing, weak recovery | Standards provider/rotation/rate/neutral errors/MFA step-up |
| XSS/content injection | Notes/content/source text rendered active | Structured sanitization/output encoding/CSP/tests |
| CSRF/clickjacking | Staff/customer mutation from another origin | Same-site/CSRF/origin/frame policy/reauth |
| Injection | Filter/sort/rule/free text reaches query/expression | Typed allowlist/parameterization/restricted DSL |
| SSRF/egress | Source/media URL makes worker call internal network | URL/host policy, fetch proxy/isolation/egress allowlist |
| Upload/parser | Polyglot, bomb, malware, SVG/script, EXIF leak | Quarantine/signature/limits/isolated decode/sanitize |
| Storage exposure | Public bucket/signed URL/key traversal/cache | Namespace policy/least privilege/random keys/origin auth/purge |
| Job/event replay | Duplicate order/activation/callback/late output | Idempotency/schema/signature/nonce/state/tombstone |
| AI/provider leakage | Provider retains/trains photo or drifts product | Contract/minimize/no training/private egress/invariant/delete |
| Secret leakage | Credentials in repo/log/client/error | Secret store/scanning/redaction/rotation/incident |
| Supply chain | Malicious dependency/build/action | Lock/inventory/signature/scanning/least CI/reproducibility |
| Availability/cost | AI/upload/search/WhatsApp abuse | Quotas/rate/backpressure/circuit breaker/budgets |
| Backup/restore | Deleted photo or revoked asset restored public | Encryption/access/drill/deletion ledger/pre-exposure validation |
| Privacy misuse | Client photo reused in portfolio/training/analytics | Purpose/consent/access/data lineage/audit/delete |

Threat review repeats on provider/architecture/data/role/public sharing change.

## 5. Identity, sessions and authorization

Guest tokens are opaque/scoped/expiring/revocable; account sessions secure/rotated/revocable; staff high-risk actions need approved MFA/step-up; service identities separate. Authorization checks exact actor/capability/object/owner/assignment/state/version/environment. Denied/not-found responses avoid existence leak. Role grants/revokes are audited and re-evaluate sessions.

No authentication method/provider is selected until `TBD-ACCOUNT-*`/ADR. Support impersonation/emergency access absent by default.

## 6. Web/API security

After stack selection controls include TLS/HSTS equivalent, secure cookie/token handling, CSRF, strict CORS, CSP/frame/referrer/content-type/permissions policies, output encoding/sanitization, trusted types where applicable, dependency/build integrity, input schemas, query/filter allowlists, idempotency and safe errors. Redirect/deep links allowlisted and cannot carry tokens/private URLs.

Rate limiting uses actor/IP/device coarse signals carefully without opaque fingerprinting, accessibility discrimination or leaking threshold. Contact/WhatsApp/auth/upload/AI/admin have separate abuse policies.

## 7. Upload and media security

Upload grant exact key/purpose/owner/type/size/expiry; quarantine and isolated parser; signature/decode/dimension/pixel/decompression/malware/metadata checks; filenames sanitized; public delivery only approved derivative. Private object grants short-lived/no shared cache. Staff cannot browse client photos by broad admin. Delete/revoke tombstone blocks late work and cache/origin.

## 8. External sources, providers and egress

AMIGO adapter uses permission scope, least-privilege secret, source rate/terms, capture verification and no closed-interface bypass. AI provider receives minimum private data only after review; no training/retention; callbacks authenticated/replay protected; deletion/incident/exit tested. WhatsApp payload minimal and editable; external app opening not delivery evidence. Analytics is optional and product functions when down.

Egress is deny/allowlisted by workload where feasible. Arbitrary user/source URL fetch is prohibited; approved fetcher validates scheme/host/DNS/IP/redirect/size/content and isolates network.

## 9. Data inventory and privacy contract

| Data class | Purpose | Access | Retention/delete status |
|---|---|---|---|
| Public catalog/content | Product discovery | Public approved | Version/rights/retirement policy |
| Partner source/rights evidence | Sync/provenance/legal/brand | Scoped staff/services | Contract/policy TBD |
| Guest project/cart | Configure/save/handoff | Guest token/account/assigned manager | Guest TTL TBD |
| Customer account/contact | Identity/support/orders | Owner/scoped staff | Account/legal policy TBD |
| Lead/address/order/warranty | Fulfil local service | Customer-safe/assigned staff | Business/legal policy TBD |
| Client photo/masks/outputs | Requested visualization only | Owner/job; support default deny | Guest/account TTL/delete/provider/backup TBD |
| Price/quote/history | Reproducible offer/order | Owner/scoped staff | Financial/legal policy TBD |
| Audit/security events | Integrity/investigation | Restricted auditor/security | Retention TBD; minimized |
| Analytics | Product quality/measurement | Aggregate/product roles | Consent/retention/fields TBD |

No data class gets indefinite retention silently. `TBD-PRIV-*`, `TBD-ASSET-RETENTION-001` and legal decisions must close exact values.

## 10. Notice, consent and rights

Notice is layered/clear before data collection, states controller/business identity (pending legal data), purpose, data, recipients/providers, retention/deletion, rights/contact and optionality. Consent, where chosen/legal, is purpose-specific, affirmative, versioned, withdrawable and not bundled with service unnecessarily. Withdrawal stops future optional processing and triggers applicable delete/restrict; it does not falsify required legal/audit history.

Partner media uses `PARTNER_LICENSE` relationship and asset publication records, not customer consent. Client portfolio/training needs separate explicit basis; visualization consent cannot be repurposed.

## 11. Logging, telemetry and audit

Structured logs allowlisted fields: timestamp, environment/service/version, route/job/event template, safe actor/object pseudonymous IDs, status/error/correlation, latency/resource/version/freshness. Prohibited: passwords/tokens/cookies/auth headers, full contact/address/free text, object/signed/source URLs, image/mask/prompt/content, partner credentials/raw export, unredacted provider payload.

Audit stores minimal before/after/version/state/reason/evidence refs under restricted immutable controls. Access/export of audit is itself audited. Redaction tests scan samples and simulated failures.

## 12. Encryption, secrets and keys

Encrypt transport and managed storage; sensitive fields/envelopes/backup encryption according to threat/evaluation. Key/secret provider/vendor/rotation periods remain ADR/TBD, but inventory, least privilege, environment separation, rotation/revoke and access audit are mandatory. No secret in repo/docs/client/image metadata/log. Compromise procedure rotates, invalidates sessions/grants and investigates exposure.

## 13. Retention, deletion and restore

Deletion graph spans primary DB, search/cache, object originals/derivatives, jobs/queues, provider, shares/exports, analytics where identified and backups. Immediate access revoke precedes async cleanup. Tasks are idempotent/retriable/evidenced; partial failure remains blocked and alerts. Restore applies deletion/revocation ledger before any exposure. Legal hold, if required, is explicit/scoped/approved and not an all-data default.

## 14. Secure development and deployment requirements

When implementation is authorized: branch/review/CI least privilege, secret/dependency/license/SAST scanning, reproducible locked dependencies, protected environments, signed/traceable artifacts where selected, security headers/config tests, migrations/rollback, production data isolation, vulnerability intake/patch SLA decisions and penetration/threat testing proportionate to risk. No technology is chosen by this paragraph.

## 15. Incident response

Detect → triage severity/data/scope → contain/revoke/rotate/block → preserve minimized evidence/access → eradicate/fix → recover/verify → legal/user/provider notification decision → retrospective/tests/control update. Owners/contact/escalation/notification deadlines remain `TBD`, but every high-risk alert needs a runbook and reachable role before launch.

## 16. Failures and edge cases

Cases: leaked guest/signed token; revoked staff session; guessed ID; permission scope revoke; malicious source/file/redirect; delete during AI/provider callback; provider cannot delete; audit/log sink down; clock skew/replay; partial restore; cache serves revoked asset; contact spam; account deletion with active order; legal request; lost/compromised device; secret committed; dependency vulnerability. Each must fail safe, preserve evidence and avoid broad access/data loss.

## 17. Acceptance and security/privacy tests

Primary: `AC-SEC-001`, `AC-PRIV-001`, `AC-AUTH-001`, `AC-AI-UPLOAD-001`, `AC-VIS-DELETE-001`, `AC-ASSET-REVOKE-001`, `AC-ADMIN-001`.

Tests: full authz/IDOR matrix, CSRF/XSS/injection/SSRF, headers/CORS/cache, auth/session/recovery/rate, upload/parser/polyglot/bomb, storage/public policy/signed URLs, provider callback/replay/delete, job/event idempotency, secret/PII telemetry scan, consent/version/withdrawal, retention/delete/backup restore, role/approval separation, dependency outage, supply-chain/config and incident tabletop.

## 18. Dependencies, risks and open questions

Dependencies: all specs, legal review, provider/hosting/storage/auth/AI ADR/evaluation. Open: `TBD-PRIV-*`, `TBD-ACCOUNT-*`, `TBD-INFRA-*`, controller/legal docs, exact retention/RPO/RTO, providers/regions/subprocessors, incident owners/timings, vulnerability SLAs and support access. Risks: legal incompleteness, public storage, IDOR, provider training/retention, secret/log leakage, incomplete deletion and security controls deferred after launch.

## 19. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined threat model, mandatory controls, data inventory, provider/media/privacy/retention/incident and test contracts without invented policy values. |
