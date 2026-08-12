# ADR-0012: Staff Argon2id password authentication

## Metadata

| Field | Value |
|---|---|
| Status | **Accepted for Phase 1F.1 implementation and production topology** |
| Date | 2026-08-12 |
| Decision | Product Owner through `OWNER-DECISION-019` |
| Scope | OWNER/ADMIN/MANAGER login, password lifecycle and session security; no customer identity |
| Supersedes | ADR-0011 staff sign-in factor and production e-mail dependency; retains its named-staff, hash-only session, RBAC and audit boundaries |

## Context and drivers

Phase 1F proved named staff identities and rotating database sessions through local passwordless e-mail codes. The MVP now needs a production-operable Russian VPS login that does not depend on an unselected mail provider or shared development key. Customer accounts remain out of scope. Password storage, bootstrap, recovery, rate limiting and final-OWNER protection therefore need an explicit server-side boundary.

Drivers: individual staff attribution, no external identity credential, offline-safe VPS operation, phishing/enumeration/brute-force controls, revocable sessions, safe bootstrap and a reversible migration from local OTP.

## Options

1. Keep e-mail OTP in production: rejected because the sender/provider/region/credential remains unselected and is unnecessary for this scope.
2. Shared `.env` administrator password: rejected because it removes individual attribution, rotation and least privilege.
3. Managed external identity provider: rejected for this phase because it adds an unknown production credential and provider dependency.
4. Per-staff Argon2id password with PostgreSQL sessions and local-only legacy bootstrap: accepted.

## Decision

1. `/admin/login` MUST accept normalized login or e-mail plus password only for active OWNER, ADMIN or MANAGER.
2. Password records MUST use Argon2id v19, a unique random 16-byte salt, a 32-byte tag and the RFC 9106 memory-constrained recommendation (`m=65536 KiB`, `t=3`, `p=4`) through pinned Node 24 `node:crypto`; the encoded record includes algorithm/version/parameters/salt/tag for future rehash.
3. Hash/verify MUST execute only on the server. Plain password, hash, salt, session token and recovery material MUST NOT enter URL, client DTO, log, audit metadata, `.env` or shell history.
4. Authentication responses remain identifier-neutral. Failed attempts are bounded by normalized-identifier HMAC and coarse client bucket, audited without raw identifier/IP, and cause a temporary lock with server-owned duration.
5. Successful login rotates any presented session, issues a random hash-only PostgreSQL session and sets HttpOnly, Path `/`, SameSite=Strict, production-Secure cookie with 12-hour absolute expiry.
6. First bootstrap password MUST be changed before other admin work. Password change revokes other sessions; logout, logout-all and individual revoke remain available.
7. `pnpm admin:create-owner`, `admin:reset-password`, `admin:list-staff` and `admin:revoke-sessions` use hidden interactive password input where applicable, never print hashes/tokens and cannot replace an existing OWNER silently.
8. OWNER may manage ADMIN/MANAGER. ADMIN may manage MANAGER only. No actor may self-promote, manage a higher role or remove the last active OWNER capability.
9. Phase 1F passwordless code routes and `pnpm dev:owner` MAY remain only when `APP_ENV=local|test`; production configuration MUST fail if the development factor/key is enabled.
10. Customer identity, password reset e-mail, public signup and `/account` remain absent.

## Consequences, risks and rollback

Positive: production staff access has no e-mail/provider dependency, uses individual credentials and reuses proven server-side session/RBAC/audit controls. Costs: password policy/support and CPU/memory load require rate limits and operational recovery.

Risks are mitigated by async Argon2id, constant-time tag comparison, unique salts, bounded attempts/lock, generic errors, forced first change, session rotation/revocation and CLI-only audited reset. The chosen parameters follow the memory-constrained recommendation in [RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html#section-4) and MUST be benchmarked in the target container before deployment without lowering them silently.

Rollback disables password login, revokes password-created sessions and returns local/test only to the existing code flow. Production rollback cannot enable local OTP or a shared key. Password records and audit evidence remain until an approved retention/forward-compensation step removes them.

## Links

- [AUTH_ACCOUNTS_SPEC](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md)
- [ROLES_PERMISSIONS](../specs/01-product/ROLES_PERMISSIONS.md)
- [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md)
- `OWNER-DECISION-019`, `P1F1-AUTH-*`, `P1F1-RBAC-*`, `QG-421`–`480`
