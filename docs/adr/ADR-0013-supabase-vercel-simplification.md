# ADR-0013: Supabase + Vercel simplification

## Status

Accepted on 2026-08-12 by `OWNER-DECISION-021`. Supersedes the active-runtime portions of ADR-0001/0002/0003/0006/0007/0008/0009/0011/0012; their historical evidence and non-conflicting security, provenance, pricing and recovery principles remain valid.

## Context

The accepted Phase 1 runtime requires a local PostgreSQL process, Prisma, Graphile Worker, VersityGW, Mailpit, Docker orchestration, immutable catalog/price release machinery, a complex configurator and deterministic preview. The commercial MVP now needs a smaller guest catalog-to-WhatsApp flow that one owner can operate without permanent processes or mandatory Docker.

## Drivers

- one ordinary Next.js application deployable on a compatible Node host;
- a managed PostgreSQL, media and staff identity boundary with RLS;
- no customer accounts, AI, photo upload, worker or complex preview/configurator;
- reproducible, idempotent migration of approved business data without raw import history;
- server-authoritative integer pricing and immutable request snapshots;
- explicit free-tier, backup, privacy and commercial-hosting limits.

## Options considered

1. Preserve the existing self-managed topology and only add a hosted frontend.
2. Keep Prisma and S3/worker abstractions while replacing only providers.
3. Replace the active runtime with Next.js plus Supabase PostgreSQL, Storage and staff-only Auth.

## Decision

Option 3 is accepted. `apps/web` remains the single application; a second application is not created. SQL migrations under `supabase/migrations` define the minimal data model, constraints, grants, RLS, helper functions and Storage policies. Server Components perform reads; Server Actions or Route Handlers perform validated mutations. Browser code may use only the publishable Supabase key. The service-role key is server-only and used only where RLS cannot represent a trusted operation, after an explicit server authorization check.

The browser cart stores only material identity, millimetre dimensions and quantity. The server loads current material/rule data and recalculates every position. Historical requests retain name/article/price/dimension snapshots. Unsupported or unproven legacy pricing becomes `MANUAL`; an old card/base “from” price MUST NOT be reinterpreted as a per-square-metre rate.

Stable migration identity is preserved separately from non-unique article values. Catalog media is reduced to one rights-approved primary WebP per material, deduplicated by SHA-256. Raw AMIGO snapshots, technical jobs, client photographs and AI assets are excluded.

## Consequences

- Prisma, Graphile Worker, AWS S3 adapters, VersityGW, Mailpit and the worker application leave the active runtime.
- Existing versioned import and preview modules remain available in Git history and are inventoried as legacy.
- Supabase becomes a production dependency; standard Next.js portability is preserved through a small repository/config boundary and ordinary SQL.
- Supabase Free and Vercel Hobby are capacity/test options, not automatic commercial-production approval.
- Staff passwords are not migrated. A first OWNER is created through a documented server-side bootstrap procedure.

## Security and privacy

Every exposed table has RLS. Guests read only published catalog, portfolio and public settings. Guests never insert orders with the anon key. Staff role and active state are read from `staff_profiles`, never client metadata. Admin mutations are server-authorized and audited; the final active OWNER is protected. Service-role material is rejected from browser code, logs and build artifacts.

## Risks

- incorrect legacy identity or price mapping;
- storage growth or egress above a free allowance;
- RLS policy gaps or service-role leakage;
- migration without a valid restore point;
- cloud activation before privacy/legal decisions.

Each risk is a stop condition in the Phase 2A plan and acceptance gate.

## Rollback

Do not delete the old database or object storage. Stop the new deployment, restore the pre-migration application from tag `pre-supabase-vercel-migration`, restore the verified SQL/media backup where required, and leave any imported Supabase project isolated for diagnosis. No destructive reverse ETL is automatic.

## References

- `OWNER-DECISION-021`
- `QG-481`–`QG-540`
- `docs/06-plans/active/PHASE_2A_SUPABASE_VERCEL_MIGRATION_PLAN.md`
- `docs/specs/04-technical/ARCHITECTURE.md`
- `docs/specs/04-technical/SECURITY_PRIVACY.md`
- `docs/00-global/PRICING_SOURCE_POLICY.md`
