# Security and privacy specification PROJECT_NAME

## Phase 2B private-photo controls

Generation requires versioned consent and a neutral notice that the temporary photo is sent to Gemini through Polza AI and that output is approximate. An HttpOnly SameSite guest cookie is stored only as a one-way hash on the job; an expiring IP hash is abuse metadata, never a permanent raw IP. Both AI buckets are private, guests receive only exact-path signed grants, and server routes revalidate ownership and published material/image identity. Polza/service-role secrets and the closed prompt remain server-only. Provider-result download enforces HTTPS, Polza host allowlisting, DNS/private-address rejection, redirect/time/byte/MIME/magic/decode bounds. Default retention is 24 hours; delete, expiry, cleanup and privileged image viewing are audited.

## Phase 2A Supabase boundary

RLS is enabled on every exposed table. Guests read only published catalog/portfolio/public settings and cannot write orders through anon credentials. Active staff role comes from `staff_profiles`, never client metadata. `SUPABASE_SERVICE_ROLE_KEY` is server-only and forbidden in `NEXT_PUBLIC_*`, browser bundles, logs and errors. Admin/order routes validate origin, body, IDs and prices. Production PII remains blocked until existing legal/privacy questions close.

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1F.1 staff password and public-data controls authorized; customer/AI runtime absent |
| Версия | 0.11.0 |
| Дата | 2026-08-12 |
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
- **SEC-PRIV-016 — MUST:** local object-storage root credentials are generated/injected only through process environment, never committed, returned to a browser or printed in logs/evidence; repository examples contain placeholders only.
- **SEC-PRIV-017 — MUST:** local S3/Admin/Web UI endpoints are loopback-only and all trust-zone buckets deny anonymous write, listing and read. `PUBLIC_DELIVERY` permits only controlled scoped delivery and never permanent unbounded signed URLs.
- **SEC-PRIV-018 — MUST:** source URLs, object keys, signed URLs and credentials are treated as sensitive telemetry fields; storage/media contract tests scan logs and fail on generated credential disclosure.

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

## 18. Implementation record

Phase 1A controls include typed server/public configuration, fail-fast secrets, secret/artifact scanning, nonce CSP and secure headers, exact-origin/CSRF/body-size/rate-limit boundaries, safe error contracts, redacted structured telemetry, private-by-default storage, deny-by-default server authorization and synthetic session revoke/expiry. Evidence: [Phase 1A report](../../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

Phase 1B.1 used real partner catalog media but no customer PII, customer upload, external identity or production credential. The bounded source transport enforced allowlisted HTTPS paths, SSRF/redirect/rate/size/MIME/dimension/decompression controls and generated object keys. OWNER and ADMIN duties remained separate; admin tokens are HttpOnly/server-side, public DTOs omit raw/source/object/credential data, media delivery rechecks MIME/length/SHA, and storage/data outages fail closed without internal detail. Anonymous list/read/write remained denied, repository and 3,354-file generated-canary artifact scans passed, and 25/25 multi-browser degraded-state scenarios passed. Evidence: [Phase 1B.1 report](../../06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md).

Phase 1D introduces no customer photo, upload, AI provider, paid API or production secret. Preview state ownership is bound to a random guest key whose hash is stored server-side; safe 32-character state IDs alone cannot authorize read/update/delete. Create/update mutations enforce origin, signed CSRF, rate and idempotency boundaries. Family/model/article and layer role are resolved from active PostgreSQL plus an allowlisted manifest, never from a client URL. Storage responses recheck source marker/MIME/length/SHA and omit source URL, object key and credentials; state is `no-store`, errors are correlation-only and stack-free. Admin diagnostics expose only aggregates.

Phase 1E local/CI checkout uses synthetic contact data only. A 256-bit guest token is stored as an HttpOnly/SameSite cookie (Secure in production) while PostgreSQL stores its hash. Origin/CSRF/body/rate/idempotency checks protect mutations; object ownership and staff role/version are rechecked server-side. Contact data is absent from URLs, public summaries, WhatsApp payloads, analytics and structured logs; seven runtime logs passed a synthetic PII scan. Public references are random, hash-verified, revocable and neutral on enumeration. Recipient `79635851036` is a server literal, and public preview bytes are proxied without storage URLs. Production intake remains disabled by `TBD-BIZ-005` and `TBD-PRIV-002/004/005` rather than receiving invented retention/legal values.

## 19. Phase 1F controls

- **P1F-SEC-001 — MUST:** OTP/session/invitation secrets use CSPRNG, keyed hashing and constant-time comparison; plaintext is confined to the immediate response-to-delivery handoff and prohibited from logs, audit and persistence.
- **P1F-SEC-002 — MUST:** login responses are enumeration-neutral; IP/coarse-client and keyed-identifier rate limits, attempt counters, resend delay and atomic consume resist brute force and replay.
- **P1F-SEC-003 — SUPERSEDED:** Phase 1F has no customer cookie. The staff cookie is HttpOnly, SameSite=Strict, production-Secure, hash-only, rotated/revocable, and fixation/replay fails closed.
- **P1F-SEC-004 — MUST:** portfolio ingestion validates declared and detected MIME, signature, decoded dimensions, byte limit, safe generated name and SHA-256, strips EXIF/unsafe metadata into a derivative, and quarantines or rejects malformed/polyglot input.
- **P1F-SEC-005 — MUST:** production e-mail and PII collection remain disabled until provider/residency/legal/retention gates close; local/CI uses Mailpit and synthetic data only.
- **P1F-SEC-006 — MUST:** audit captures actor/action/outcome/correlation and safe before/after state without e-mail, phone, OTP, token, filename, storage locator or free-form secret-bearing payload.
- **P1F-SEC-007 — MUST:** every customer-facing route remains guest-only and cannot issue a staff or customer credential; `/login` is staff-labelled and inaccessible as a customer-account creation path.
- **P1F-SEC-008 — MUST:** CRM-contact and internal-note authorization is staff-only, deny-by-default and excluded from public references, caching, logs and broad dashboard aggregates.

## 20. Dependencies, risks and open questions

### 20.1. Phase 1F.1 password and public-data controls

- **P1F1-SEC-001 — MUST:** staff passwords are derived with server-only Argon2id per ADR-0012; plaintext, encoded hash, salt, session token and reset material are excluded from URL, API DTO, client bundle, logs, audit metadata, analytics, environment and command output.
- **P1F1-SEC-002 — MUST:** login/change/logout/revoke/staff/coverage/cart mutations enforce exact origin, CSRF, content type/body bounds and rate/idempotency where applicable; authorization is rechecked inside the data command.
- **P1F1-SEC-003 — MUST:** login throttling resists distributed identifier guessing using keyed normalized identity plus coarse client bucket, generic timing/message and temporary lock without storing raw password/IP.
- **P1F1-SEC-004 — MUST:** successful login/password change rotates or revokes sessions to prevent fixation/replay; disable/demotion/reset and logout-all invalidate affected sessions immediately.
- **P1F1-SEC-005 — MUST:** production startup rejects synthetic/development login, default signing keys, missing critical secrets and non-Secure staff cookie configuration.
- **P1F1-SEC-006 — MUST:** public/configurator/cart/preview/request HTML, DTO and errors exclude raw technical statuses, UUIDs, source IDs, CatalogVersion/PriceVersion/internal rule IDs, parser/debug/provider messages and stack traces; correlation ID is shown only for support recovery.
- **P1F1-SEC-007 — MUST:** price/status/version tampering cannot create or alter cart value; the server resolves the immutable QuoteSnapshot under guest ownership.
- **P1F1-SEC-008 — MUST:** AI/photo provider credentials, requests and uploads do not exist in Phase 1F.1 runtime; documentation-only provider fields cannot be public environment variables.

Dependencies: all specs, legal review, provider/hosting/storage/auth/AI ADR/evaluation. Open: `TBD-PRIV-*`, `TBD-ACCOUNT-*`, `TBD-INFRA-*`, controller/legal docs, exact retention/RPO/RTO, providers/regions/subprocessors, incident owners/timings, vulnerability SLAs and support access. Risks: legal incompleteness, public storage, IDOR, provider training/retention, secret/log leakage, incomplete deletion and security controls deferred after launch.

## 21. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.11.0 | 2026-08-12 | Authorized Argon2id/login/session controls, public technical-data redaction and quote-only price authority. |
| 0.1.0 | 2026-08-02 | Defined threat model, mandatory controls, data inventory, provider/media/privacy/retention/incident and test contracts without invented policy values. |
| 0.2.0 | 2026-08-02 | Recorded verified synthetic Foundation controls while retaining all PII/media/legal/provider production gates. |
| 0.3.0 | 2026-08-02 | Added Phase 1B.1 non-PII catalog/media security boundary without enabling user media or production providers. |
| 0.4.0 | 2026-08-03 | Applied local VersityGW loopback/all-private/environment-secret/log-redaction controls from `OWNER-DECISION-011`. |
| 0.5.0 | 2026-08-03 | Recorded verified Phase 1B.1 SSRF/media integrity, role separation, fail-closed public delivery, secret scans and no-PII/no-production boundary. |
| 0.6.0 | 2026-08-08 | Recorded Phase 1D opaque guest ownership, origin/CSRF/rate/idempotency, manifest allowlist, storage integrity, safe caching/errors and explicit no-photo/no-AI boundary. |
| 0.7.0 | 2026-08-09 | Recorded verified Phase 1E hashed guest ownership, CSRF/origin/rate/idempotency, immutable server money, fixed recipient, revocable PII-free public projection, staff denial and synthetic log scan while production PII stays gated. |
| 0.8.0 | 2026-08-09 | Added Phase 1F OTP/session/invitation, account/admin authorization, local Mailpit, portfolio ingestion and redacted audit boundaries while production PII/provider remains gated. |
| 0.9.0 | 2026-08-09 | Narrowed Phase 1F to staff-only OTP/session security and request-derived CRM contact privacy; customer authentication/account cookies are prohibited. |
| 0.10.0 | 2026-08-09 | Recorded verified hash-only OTP/session/invitation, last-OWNER/RBAC, request-contact/note isolation, private portfolio ingestion, redacted audit, Mailpit/recovery/browser/secret-scan controls and absence of customer authentication. |
