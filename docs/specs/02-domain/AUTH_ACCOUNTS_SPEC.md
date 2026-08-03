# Authentication and accounts specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 0C `READY_WITH_NON_BLOCKING_TBD`; basic saved-calculation account scope resolved, public identity method/recovery awaits Phase 1F gate |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Permissions | [ROLES_PERMISSIONS.md](../01-product/ROLES_PERMISSIONS.md) |
| Security | [SECURITY_PRIVACY.md](../04-technical/SECURITY_PRIVACY.md) |

## 1. Назначение and boundaries

Спека определяет guest ownership, optional customer account, staff/service identities, sessions, project claim, recovery/deletion boundaries and authorization integration without selecting a provider or login factor.

In scope: guest-first product, account lifecycle, session/device concepts, identity verification boundary, project/cart/visualization ownership, profile preferences, staff/service separation, audit and safe failure.

Out of scope: provider/vendor, concrete credential type, social login, MFA mechanism, billing identity and collecting government/financial documents.

## 2. Actors and roles

Guest uses public catalog and scoped project/cart/visualization tokens. Customer owns claimed resources. Manager/admin/owner/content use staff identities with capabilities. Sync and AI workers use workload identities, never user passwords. Identity administrator capability is separate from business admin.

## 3. Нормативные требования

- **ACCOUNT-SPEC-001 — MUST:** browsing, configuring, preliminary pricing, standard preview, optional AI visualization, cart and handoff remain available to guest subject to scoped token/rate/privacy controls.
- **ACCOUNT-SPEC-002 — MUST:** account creation is optional for initial funnel and cannot be forced solely to view result or request contact.
- **ACCOUNT-SPEC-003 — MUST:** identity method, verification, recovery, MFA and session durations require approved ADR/TBD; no insecure default is implied.
- **ACCOUNT-SPEC-004 — MUST:** authentication and authorization/object ownership are separate checks on every protected request.
- **ACCOUNT-SPEC-005 — MUST:** guest ownership tokens are high-entropy opaque, hashed at rest where appropriate, purpose/resource scoped, expiring, revocable and excluded from URLs/logs/analytics where leakage is likely.
- **ACCOUNT-SPEC-006 — MUST:** project claim requires authenticated account plus proof of guest token; it is idempotent and cannot transfer a project already owned by another account.
- **ACCOUNT-SPEC-007 — MUST:** account project claim preserves configuration/quote/preview histories and rotates/revokes guest access according to policy.
- **ACCOUNT-SPEC-008 — MUST:** login/recovery errors do not enumerate whether account/identifier exists and are rate-limited/audited.
- **ACCOUNT-SPEC-009 — MUST:** session creation/refresh/revocation is bound to identity/assurance and rechecks role/capability changes.
- **ACCOUNT-SPEC-010 — MUST:** high-risk staff actions support step-up/recent authentication boundary even though mechanism is TBD.
- **ACCOUNT-SPEC-011 — MUST:** staff account, customer account and workload identity namespaces/credential policies are distinct.
- **ACCOUNT-SPEC-012 — MUST:** no shared staff identity is allowed; each mutation traces to individual/workload actor.
- **ACCOUNT-SPEC-013 — MUST:** customer profile stores only approved contact/preferences; account is not a source of product/price rights.
- **ACCOUNT-SPEC-014 — MUST:** logout/session revoke invalidates private access; signed/object URLs already issued remain independently short-lived and ownership-scoped.
- **ACCOUNT-SPEC-015 — MUST:** account deletion first revokes access and follows data-class retention/deletion; financial/audit/legal records are not silently erased or publicly accessible.
- **ACCOUNT-SPEC-016 — MUST:** deleted/disabled account identifier reuse and project ownership recovery follow explicit policy; no automatic reassignment.
- **ACCOUNT-SPEC-017 — MUST:** service identities receive job/operation minimum scope, rotate/revoke independently and cannot authenticate to interactive UI.
- **ACCOUNT-SPEC-018 — MUST:** identity secrets/tokens/codes never appear in source control, logs, analytics, support payloads or URL query strings.
- **ACCOUNT-SPEC-019 — MUST:** account export/DSAR applies ownership and redaction and excludes other users, secrets and internal security metadata.
- **ACCOUNT-SPEC-020 — MUST:** product remains usable through guest/manual fallback when identity provider is unavailable, except private account resources and high-risk actions fail safely.
- **ACCOUNT-SPEC-021 — MUST:** MVP account scope guarantees only ownership-scoped saved calculations and their immutable quote history; repeat orders, address book, favorites, full order-status CRM and other extended account functions remain post-MVP until separate scope approval.

## 4. Conceptual data model

| Entity | Fields / invariants |
|---|---|
| `Account` | ID, type/customer/staff, lifecycle state, verified identities refs, created/disabled/deleted timestamps |
| `Identity` | Provider/method ref, normalized identifier hash/display hint, verification/assurance, no raw credential |
| `Session` | ID hash/ref, account, assurance, created/last/revoked/expiry, device metadata minimized |
| `RoleAssignment` | account, role/capabilities/scope, grantor/reason/effective/expiry/revocation |
| `GuestOwnership` | token hash, resource/purpose scope, created/expiry/revoked/claimed account |
| `ProjectOwnership` | project, owner account or guest scope, claim history/version |
| `RecoveryAttempt` | generic outcome/rate/audit metadata; secrets short-lived and protected |
| `ConsentPreference` | purpose/channel/version/source/timestamps; not bundled into one blanket flag |
| `DeletionRequest` | subject/scope/state/tasks/evidence and retention exceptions |
| `WorkloadIdentity` | service, allowed scopes/environment, rotation/revocation, no interactive login |

## 5. Account and session states

### Account

`PENDING_VERIFICATION → ACTIVE → DISABLED/LOCKED → ACTIVE` where policy allows; `ACTIVE/DISABLED → DELETION_PENDING → DELETED/TOMBSTONED`. Exact verification/lock/recovery semantics remain provider/ADR dependent.

### Session

`CREATED → ACTIVE → EXPIRED/REVOKED`; refresh creates/rotates according to approved method and replay handling. Role/account changes can force `REVOKED` or step-up.

### Guest ownership

`ACTIVE → CLAIMED/EXPIRED/REVOKED`; only one terminal transition commits. Claim creates durable ownership record and retains audit without exposing token.

## 6. Primary and alternative flows

### Guest project

Server creates scoped guest token and resource. User configures/saves within scope. Expiry warning/recovery is shown according to policy. No account identifier is inferred from phone/WhatsApp alone.

### Sign-up/sign-in

After user intent, approved identity flow verifies control. Server establishes account/session assurance and returns to original safe action. Invalid/expired/replayed attempts get generic response. Exact fields/messages wait for auth ADR.

### Claim project

Authenticated user supplies guest proof. Transaction checks token state, resource ownership and account; attach succeeds once, rotates/revokes guest proof and logs event. Conflict reveals no other owner.

### Recovery

Use approved verified channel/factor with generic initiation result, short-lived single-use proof, rate/abuse limits and session revocation policy. Support cannot manually bypass without a separately approved audited process.

### Delete

Reauthenticate as policy → explain scope/retention → revoke sessions/shares → detach/delete private media/projects where allowed → pseudonymize/retain required business/audit data → completion status. Late async outputs cannot restore access.

## 7. Validation and invariants

- normalized identity uniqueness only within method/provider policy; do not assume phone/email choices;
- account state active and session valid/assurance sufficient;
- role assignment effective and object scope valid at request time;
- guest token signature/hash/purpose/resource/expiry/revocation all valid;
- claim token and target project correspond; owner absent or same account for idempotency;
- no account merge based solely on matching contact string;
- session/refresh/recovery proof single-use/rotated/revoked per approved protocol;
- password/OTP/token fields, if future, never stored in plaintext/logged;
- deletion graph cannot leave publicly accessible private object or active session;
- workload identity environment/scope matches job.

## 8. Errors and edge cases

| Case | Behavior |
|---|---|
| Login/recovery unknown vs known account | Same public response/timing envelope where practical |
| Expired/replayed proof | Generic retry/restart; audit/rate limit |
| Guest token leaked | Limited to resource/purpose/TTL; revoke/claim path |
| Two users claim same project | One atomic success; other neutral conflict |
| Same user retries claim | Idempotent owned result |
| Staff role revoked mid-session | Permission recheck denies; session step-up/revoke |
| Account disabled during AI job | Revoke delivery; cancel/delete according to policy |
| Deletion while lead/order active | Explain retained classes; revoke account/private media access |
| Identity provider outage | Public/guest/manual flows continue; login/private/high-risk fail safe |
| Clock/device mismatch | Server time; clear reauth without broader access |

## 9. Security and privacy

Use standards-based provider/protocol selected by ADR, secure transport/cookies/token storage, CSRF/XSS/clickjacking controls, brute-force/credential stuffing defenses, password/secret hygiene if applicable, MFA/step-up for staff, session inventory/revocation, anti-enumeration and immutable audit. PII is minimized; contact/consent/retention/DSAR and subprocessor mapping are required. No auth choice is made here.

## 10. Performance, observability and analytics

Auth dependency must not block public static/catalog route. Authorization is bounded/cached only with revocation-aware policy. Metrics: success/failure/rate-limit/recovery/session revoke/claim conflict by coarse method/role/environment, no identifier/token. Alerts cover abuse spikes, staff lockout, workload auth failures and audit gaps. Traces contain pseudonymous actor/session IDs only.

## 11. Acceptance criteria and tests

Primary: `AC-AUTH-001`, `AC-PROJECT-SAVE-001`, `AC-SEC-001`, `AC-PRIV-001`.

Tests: guest full funnel; optional account; valid/invalid/expired/replayed identity flows once selected; enumeration/timing/rate; session fixation/rotation/revocation/CSRF; object ownership; claim concurrency/idempotency; staff role revoke/step-up; workload scope; provider outage; account deletion with media/job/lead/order; export/redaction and accessibility.

## 12. Dependencies, risks and open questions

Dependencies: RBAC, cart/orders, AI, admin, security/privacy, API/data, observability/deployment. Open: `TBD-ACCOUNT-002`–`006`, staff identity/MFA, recovery/support, session/guest TTL, account deletion/legal retention, auth provider/region and notification channel. `TBD-ACCOUNT-001` is resolved by the MVP freeze. Risks: account forcing hurts conversion, token leakage, enumeration, broken object authorization, weak recovery, shared staff accounts and deletion race.

## 13. Связанные требования and history

Links: `FR-AUTH-*`, `NFR-SEC-*`, `NFR-PRIV-*`, `RBAC-*`, `ACCOUNT-SPEC-001`–`021`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены guest-first ownership, account/session/workload models, claim/recovery/delete boundaries and safe provider outage behavior. |
