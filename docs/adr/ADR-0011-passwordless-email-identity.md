# ADR-0011: Provider-neutral passwordless e-mail identity

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted for Phase 1F local/CI; production e-mail provider remains gated** |
| Дата | 2026-08-09 |
| Решение принято | Product Owner through `OWNER-DECISION-017`, narrowed by `OWNER-DECISION-018` |
| Область | Staff sign-in, sessions, invitations and notification delivery; customer identity is post-MVP |
| Уточняет | ADR-0010 identity method and public-login hold |

## Контекст и драйверы

Phase 1F needs named staff identities without passwords, social identity, SMS or provider lock-in. `OWNER-DECISION-018` removed customer authentication before its WIP was accepted, so this ADR now governs staff only. Existing `IdentityPort`, PostgreSQL roles, audit and synthetic local bootstrap remain the authorization boundary. Production e-mail residency, sender domain, delivery vendor and legal notices are unresolved, so local acceptance must not silently select them.

## Варианты

1. Passwords: rejected because recovery, storage and support risk add no value to the approved scope.
2. Managed identity/e-mail provider now: rejected because production provider/residency/credentials are not authorized.
3. Provider-neutral one-time e-mail codes over `EmailDeliveryPort`, PostgreSQL state and local Mailpit: accepted.

## Решение

1. Staff authentication MUST use a single-use numeric e-mail code. Customer authentication is not implemented; no reusable password, SMS or social login is added.
2. The application MUST normalize e-mail, store only an HMAC-SHA-256 code hash and opaque random session-token hash, compare in constant time, and never log or return either secret.
3. A code expires in 10 minutes, permits five verification attempts and cannot be resent for 60 seconds. Request and verify responses MUST be enumeration-neutral and rate-limited by keyed identifier plus coarse client bucket.
4. Staff sessions have a 12-hour absolute lifetime, rotate after authentication/security-sensitive use and are revoked by applicable role/disable changes.
5. The staff cookie MUST be HttpOnly, Path `/`, SameSite `Strict` and Secure outside local/test. Mutations retain origin and CSRF checks. No customer cookie is issued.
6. Staff identities MUST originate from an unexpired OWNER/ADMIN-authorized invitation or local-only `pnpm dev:owner --email` bootstrap. Successful verification never creates a customer identity.
7. E-mail delivery MUST use `EmailDeliveryPort`. Mailpit is the disposable local/CI SMTP/web inbox adapter; no production delivery vendor, sender domain or credential is selected.
8. Delivery, invitation and cleanup MUST be durable versioned Graphile Worker tasks with minimal reference payloads and idempotency keys. Ownership migration is post-MVP.
9. Existing synthetic sessions remain local test/bootstrap compatibility only and MUST NOT become a production login path.

## Последствия и риски

Positive: no password database, replaceable delivery and auditable named staff. Costs: e-mail availability affects staff login and codes need abuse controls. Mailpit outage leaves the request retryable and never exposes the code through the API. The public customer path is unaffected because it has no login dependency.

Risks are mitigated by hash-only storage, short TTL, attempt/resend/rate limits, atomic consume, session rotation/revocation, invitation-only staff creation, last-OWNER protection, safe errors and audit events without identifiers.

## Откат / supersede

The delivery adapter can be replaced behind `EmailDeliveryPort`. A future managed staff provider requires a superseding ADR, identity mapping, session invalidation and tested rollback. Future customer identity requires a separate post-MVP decision and ADR impact review. Disabling Phase 1F staff login revokes staff sessions and stops delivery jobs while preserving identity/audit history under the unresolved retention policy.

## Связи

- `OWNER-DECISION-017/018`, `FR-AUTH-*`, `ACCOUNT-SPEC-*`, `RBAC-*`, `NFR-SEC-*`
- [AUTH_ACCOUNTS_SPEC](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md)
- [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md)
- [ADR-0010](ADR-0010-identity-secrets-and-observability-boundary.md)

## История

| Дата | Изменение |
|---|---|
| 2026-08-09 | Accepted passwordless code/session and provider-neutral delivery boundary for local/CI Phase 1F. |
| 2026-08-09 | `OWNER-DECISION-018` narrows the accepted boundary to staff-only authentication; customer authentication/accounts move to post-MVP. |
