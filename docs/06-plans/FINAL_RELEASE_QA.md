# Phase 2C final release QA — 2026-08-13

## Current result

Local application, configured Supabase runtime and one paid Polza/Gemini Zebra path are `PASS`. Draft PR #1 and the target-account Vercel Preview are delivered; owner Preview inspection remains manual and production promotion is not authorized.

## Executed checks

| Area | Evidence |
|---|---|
| Documentation | 105 files, 34 canonical specs and 2,165 normative IDs passed before the final evidence additions; the final count is re-run before delivery. |
| Formatting | Repository Prettier gate passes after mechanical normalization. |
| Static analysis | ESLint with zero warnings and strict TypeScript pass. |
| Unit/contract | 6 Node tests plus 55 Vitest tests pass; no skips. |
| Browser/visual/a11y | 6 Phase 2C Chromium checks pass, including ten viewports, reduced motion, keyboard listbox, 13 visual baselines and exact Zebra/cart. |
| Production build | Next.js 16.2.12 build passes on Node 24.19.0 / pnpm 11.18.0 with 33 dynamic routes. Pinned Node is 24.18.1, so the +patch runtime drift is recorded rather than hidden. |
| Secrets/artifacts | Source secret scan passes; production artifact scan passes across 11,923 generated files using configured server-only canaries. |
| Supabase | 16 public tables reachable; 7 public categories, 1,131 public exact materials, one settings row and Storage pass. Migration-history table is absent, so reviewed idempotent SQL/schema introspection is the current deployment evidence. |
| Exact price/order | Active `amigo-67c782a10449cdb7`; Zebra count 137; 1,000×1,000 exact result 1,185,000 kopecks; order RPC transaction rollback verified. |
| Staff auth | Requested OWNER exists, profile is active and live browser login/dashboard/materials pass. |
| Backup | Ignored custom-format DB dump 695,878 bytes and 1,371-object Storage manifest pass checksum/manifest verification. Restore drill still requires a disposable project. |
| Live AI | Rights-cleared Zebra case passes direct private upload, confirmation, paid Polza/Gemini create/poll, one-result private import, 1,500×937 before/after and owned delete; both job folders are empty afterward. Two paid diagnostic tasks cost 15.70932384 ₽ in total. |

## Security correction found by QA

The legacy DB backup command originally passed a credentialed connection URL to the `pg_dump` process, which could be included in an OS spawn error when the executable was absent. It now removes the password and unsupported pooler hint from process arguments, passes the password only through child `PGPASSWORD`, accepts an optional local `PG_DUMP_PATH`, and reports a sanitized start error. The source secret scan and a successful live dump verify the corrected path.

## Explicit non-claims and remaining production gates

- No merge, production alias, production Supabase activation, payment or customer account was created.
- Phase 2B formally remains `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING` only because roller and horizontal-or-vertical quality cases in `AIEVAL-019` are not complete; provider connectivity, Zebra result import and delete now pass.
- Final brand/logo/legal/privacy copy remains unresolved; the neutral Preview fallback is intentional.
- Vercel Hobby is not claimed as a commercial production plan.
- The DB/Storage restore drill is documented but not claimed without an isolated disposable project.
