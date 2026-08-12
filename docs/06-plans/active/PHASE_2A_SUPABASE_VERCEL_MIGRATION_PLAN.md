# Phase 2A — Supabase + Vercel simplification migration plan

## Control

| Field | Value |
|---|---|
| Status | `IN_PROGRESS` |
| Authorized by | `OWNER-DECISION-021`, 2026-08-12 |
| Baseline | `3a0d7662a1b22724641ab29ca1cbd55fd575598e` |
| Safety tag | `pre-supabase-vercel-migration` |
| Branch | `phase/2a-supabase-vercel-simplification` |
| Architecture | ADR-0013 |
| Acceptance | `QG-481`–`QG-540` |

## Verifiable result

One standard Next.js application runs with environment-configured Supabase and no mandatory Docker, Prisma, worker, VersityGW, Mailpit, AI or complex preview/configurator runtime. Approved catalog/media migrate through idempotent ETL; guest calculation/cart/request/WhatsApp and Russian staff administration pass proportional tests. Missing cloud credentials leave only documented activation steps, never simulated success.

## Execution stages

| # | Stage | Status | Dependency / evidence |
|---:|---|---|---|
| 1 | Read canonical docs; audit Git/runtime/data/capacity; preserve pre-existing WIP; create tag/branch | `COMPLETED` | stash `ce787c4f…`; baseline and local data evidence |
| 2 | Authorize scope, ADR, gate and target contracts | `COMPLETED` | this plan, `OWNER-DECISION-021`, ADR-0013, `LEGACY_FEATURES.md` |
| 3 | Create minimal Supabase SQL/RLS/Storage/Auth model and environment boundary | `IN_PROGRESS` | schema tests and no service-role browser path |
| 4 | Create old PostgreSQL dump, checksummed export/media manifest, transform, optimize, import and repeat verification | `PENDING` | old data remains intact; stable source identity |
| 5 | Replace public runtime with catalog/search/detail, simple calculator, local cart, checkout, request and WhatsApp | `PENDING` | server recalculation and immutable item snapshots |
| 6 | Replace staff auth/admin with Supabase Auth, active profiles, role checks, audit and last-OWNER guard | `PENDING` | OWNER/ADMIN/MANAGER negative matrix |
| 7 | Remove active Docker/Prisma/Graphile/VersityGW/Mailpit/preview/AI dependencies and prepare Vercel | `PENDING` | standard `pnpm dev`/build; legacy inventory |
| 8 | Run unit/integration/migration/RLS/browser/security/build/backup checks and optional Preview | `PENDING` | exact skips and credential limitations recorded |
| 9 | Synchronize affected specs/registers/roadmap/traceability/changelog and create completion report | `PENDING` | code/spec audit and links/IDs pass |
| 10 | Finish logical commits, clean tree, push tag/branch and create Draft PR without merge | `PENDING` | PR title fixed by owner |

Only one stage may be `IN_PROGRESS`. This table MUST be updated as the phase advances.

## Fixed boundaries

- No customer registration, `/account`, payment, AI, photo upload, final premium redesign or production data deletion.
- No raw AMIGO recrawl or assumption that an old card/base price is a per-square-metre tariff.
- No automatic deletion of the old PostgreSQL database, Docker volumes or source media.
- Cloud deployment/import is conditional on credentials; commercial production is conditional on an eligible Vercel plan and privacy/legal closure.
- The uncommitted Phase 1F.1 WIP is preserved separately and is not mixed into Phase 2A.

## Stop conditions

Stop with exact evidence if the source dump is corrupt, stable material identity cannot be preserved, transformed records duplicate, optimized media still exceeds the stated allowance, RLS cannot be proven, a service-role value reaches client output, source deletion is required, or the work would require AI/final design. Missing cloud credentials alone is not a stop condition.

## Requested commit sequence

1. `docs: authorize Supabase and Vercel simplification`
2. `refactor: define simplified product scope`
3. `feat: add Supabase schema and RLS`
4. `feat: add catalog data migration`
5. `feat: migrate catalog media to Supabase Storage`
6. `refactor: replace legacy data access with Supabase`
7. `feat: add simple calculator and cart`
8. `feat: add Supabase staff authentication`
9. `feat: add simplified business administration`
10. `chore: remove mandatory Docker runtime`
11. `chore: add Vercel deployment configuration`
12. `test: verify Supabase migration and public flow`
13. `docs: complete Supabase and Vercel migration`
