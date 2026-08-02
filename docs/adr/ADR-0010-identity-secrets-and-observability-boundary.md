# ADR-0010: Identity, secrets and observability boundary

## Метаданные

| Поле | Значение |
|---|---|
| Статус | **Accepted** |
| Дата | 2026-08-02 |
| Решение принято | Product Owner, 2026-08-02; synthetic identity only in Phase 1A |
| Supersedes | — |

## Контекст и драйверы

Foundation включает базовую authorization boundary, environment validation, logging and health checks. Гость не обязан регистрироваться; admin/account data требует server-side authorization. Production hosting/data residency, credential delivery and telemetry vendor remain unknown. Custom auth cryptography и секреты в repository неприемлемы.

## Варианты

1. Self-hosted Better Auth database sessions + managed runtime secrets + OTLP.
2. Managed identity/observability provider selected now.
3. Custom auth/session layer and local env files in deploy artifact.

## Решение

1. Foundation MUST define `IdentityPort`, session verification, RBAC/capability checks and centralized data access authorization; route/proxy checks alone are insufficient.
2. Better Auth SHOULD be accepted as self-hosted session library after pinned-version security/compatibility spike. Public signup/login method remains disabled until legal, recovery, notification and provider decisions close.
3. Phase 1A MAY use only synthetic local users and an explicitly gated bootstrap admin; no production credentials or customer PII.
4. Sessions MUST be server-validated for sensitive actions, revocable, expiring and protected by secure/httpOnly/sameSite cookies, CSRF/origin controls and rate limits.
5. Secrets MUST come from ignored local/OS store or managed CI/runtime secret store; `.env.example` contains names only. Build artifacts, client bundles, logs and tests MUST NOT contain values.
6. Environment variables MUST have typed runtime validation, server/public allowlist and fail-fast startup. Rotation/revocation procedure and owner MUST exist before shared secrets.
7. Logs MUST be structured JSON with correlation IDs and denylisted PII/secret fields. Traces/metrics MUST use OpenTelemetry/OTLP so export vendor remains replaceable.
8. Health endpoints MUST separate liveness from dependency readiness and reveal no credentials, private object references or internal stack traces.

## Последствия

Identity and telemetry stay deployable without immediate SaaS choice, while protected data gets a central authorization boundary. Public login cannot launch until supporting e-mail/recovery/legal operations exist.

## Риски и меры

| Риск | Мера |
|---|---|
| Library vulnerability/misconfiguration | Pin, advisory review, negative auth tests, upgrade runbook |
| Bootstrap admin leaks | Local-only default, one-time rotation, no committed credentials |
| PII enters telemetry | Schema allowlist/redaction tests and prohibited-field scan |
| Secret unavailable/expired | Fail-fast readiness, rotation rehearsal, previous-key grace only where supported |

## Откат / supersede

Identity provider MAY be replaced behind `IdentityPort` with session invalidation and account mapping plan. Telemetry exporter MAY be disabled/replaced without changing instrumentation. Secret store migration uses dual-version rotation, verification and old credential revocation.

## Связи

- [AUTH_ACCOUNTS_SPEC](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md)
- [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md)
- [OBSERVABILITY](../specs/04-technical/OBSERVABILITY.md)
- `FR-AUTH-001`–`FR-AUTH-008`, `ACCOUNT-SPEC-001`–`ACCOUNT-SPEC-021`, `NFR-SEC-001`–`NFR-SEC-010`, `NFR-OBS-001`–`NFR-OBS-006`, `ROADMAP-1A-001`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Proposed identity/secrets/telemetry boundary; production provider не выбран. |
| 2026-08-02 | Accepted Product Owner для Phase 1A; synthetic identity, vendor-neutral secret injection и OTLP закреплены, production providers не выбраны. |
