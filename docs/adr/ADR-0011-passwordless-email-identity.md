# ADR-0011: Provider-neutral passwordless e-mail identity

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted for Phase 1F local/CI; production e-mail provider remains gated** |
| Дата | 2026-08-09 |
| Решение принято | Product Owner through `OWNER-DECISION-017` |
| Область | Customer and staff sign-in, sessions, invitations and notification delivery |
| Уточняет | ADR-0010 identity method and public-login hold |

## Контекст и драйверы

Phase 1F needs optional customer accounts and named staff identities without passwords, social identity, SMS or provider lock-in. Existing `IdentityPort`, PostgreSQL roles, audit and synthetic local bootstrap must remain the authorization boundary. Production e-mail residency, sender domain, delivery vendor and legal notices are still unresolved, so local acceptance must not silently select them.

## Варианты

1. Passwords: rejected because recovery, storage and support risk add no value to the approved scope.
2. Managed identity/e-mail provider now: rejected because production provider/residency/credentials are not authorized.
3. Provider-neutral one-time e-mail codes over `EmailDeliveryPort`, PostgreSQL state and local Mailpit: accepted.

## Решение

1. Customer and staff authentication MUST use a single-use numeric e-mail code. No reusable password, SMS or social login is added.
2. The application MUST normalize e-mail, store only an HMAC-SHA-256 code hash and opaque random session-token hash, compare in constant time, and never log or return either secret.
3. A code expires in 10 minutes, permits five verification attempts and cannot be resent for 60 seconds. Request and verify responses MUST be enumeration-neutral and rate-limited by keyed identifier plus coarse client bucket.
4. Customer sessions have a 30-day absolute lifetime and rotate after authentication/security-sensitive use; staff sessions have a 12-hour absolute lifetime and never become customer sessions implicitly. Role changes revoke affected staff sessions.
5. Cookies MUST be HttpOnly, Path `/`, SameSite `Lax` for customer navigation and `Strict` for staff administration, and Secure outside local/test. Mutations retain origin and CSRF checks.
6. New customer identities MAY be created on successful code verification. Staff identities MUST originate from an unexpired OWNER/ADMIN-authorized invitation or local-only `pnpm dev:owner --email` bootstrap.
7. E-mail delivery MUST use `EmailDeliveryPort`. Mailpit is the disposable local/CI SMTP/web inbox adapter; no production delivery vendor, sender domain or credential is selected.
8. Delivery, invitation, cleanup and ownership migration MUST be durable versioned Graphile Worker tasks with minimal reference payloads and idempotency keys.
9. Existing synthetic sessions remain local test/bootstrap compatibility only and MUST NOT become a production login path.

## Последствия и риски

Positive: no password database, optional accounts, replaceable delivery and auditable named staff. Costs: e-mail availability affects login, codes need abuse controls, and account deletion/recovery remain limited until retention/legal decisions close. Mailpit outage leaves the request retryable and never exposes the code through the API.

Risks are mitigated by hash-only storage, short TTL, attempt/resend/rate limits, atomic consume, session rotation/revocation, invitation-only staff creation, last-OWNER protection, safe errors and audit events without identifiers.

## Откат / supersede

The delivery adapter can be replaced behind `EmailDeliveryPort`. A future managed identity provider requires a superseding ADR, account mapping, session invalidation and tested rollback. Disabling Phase 1F login revokes sessions and stops delivery jobs while preserving identity/audit history under the unresolved retention policy.

## Связи

- `OWNER-DECISION-017`, `FR-AUTH-*`, `ACCOUNT-SPEC-*`, `RBAC-*`, `NFR-SEC-*`
- [AUTH_ACCOUNTS_SPEC](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md)
- [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md)
- [ADR-0010](ADR-0010-identity-secrets-and-observability-boundary.md)

## История

| Дата | Изменение |
|---|---|
| 2026-08-09 | Accepted passwordless code/session and provider-neutral delivery boundary for local/CI Phase 1F. |
