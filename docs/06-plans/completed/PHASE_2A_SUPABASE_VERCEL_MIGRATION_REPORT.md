# Phase 2A — Supabase + Vercel migration report

## Control and outcome

Baseline `3a0d7662a1b22724641ab29ca1cbd55fd575598e`; safety tag `pre-supabase-vercel-migration`; branch `phase/2a-supabase-vercel-simplification`. Pre-existing Phase 1F.1 WIP remains recoverable in stash `ce787c4fa33f93f2fcbfbe696fbe79b3a47279e3`. Authorized by `OWNER-DECISION-021/022` and ADR-0013.

Status: `PASSED_PHASE_2A_CODE_AND_PREVIEW`; Supabase cloud activation is `NOT_RUN_NO_CREDENTIALS`. This is not a claim that commercial production, live staff Auth, remote import or remote backup succeeded.

## Delivered runtime

- One standard Next.js 16 App Router application with React, strict TypeScript, Tailwind and Zod.
- Supabase PostgreSQL is the only active database adapter; Supabase Storage is the only active media adapter.
- Supabase Auth is staff-only; active `staff_profiles` owns OWNER/ADMIN/MANAGER authorization and last-OWNER protection.
- RLS is enabled on every application table; anonymous users receive only published safe views without UUID/source/pricing internals.
- Guest path includes catalog/search/filter/detail, simple calculator, localStorage cart, checkout, immutable request snapshot and truthful WhatsApp URL.
- AREA/FIXED/MANUAL calculation uses integer kopecks, BigInt intermediate math and the 1500 ₽ per-unit minimum; the server ignores browser prices.
- Russian administration covers categories/materials/prices/availability/visibility, requests, portfolio, settings and staff status/role.
- Portfolio objects remain private and are read through short-lived signed URLs; catalog/branding expose only approved objects.
- Prisma, Graphile Worker, separate worker, VersityGW, Mailpit, S3 SDK, AMIGO runtime scraping, AI and complex preview/configurator are excluded from the active workspace/build.
- Old infrastructure templates are under `legacy/infrastructure`; source DB, storage and Git history were not deleted.

## Data and media evidence

Old PostgreSQL measured 436,917,951 B. Approved legacy storage measured 519,671,532 B; active primary media before the owner filter was 438,897,117 B.

The five owner-excluded product groups resolve to 9 category rows including descendants, 227 materials and 226 primary images/175,137,385 B. Source rows remain untouched.

Target transform contains 19 categories and 1,428 materials. All legacy card/base prices that lack a proven square-metre rate are safely `MANUAL`; no false rate was invented. Twelve synthetic/development requests were skipped; portfolio source was empty; one safe settings row remains.

Retained primary source media is 265,007,878 B. WebP optimization produced 1,371 objects/91,215,814 B; 57 duplicate references share hash-addressed objects. Second transform and optimize runs created no duplicates (`NO_OP`).

Projected target DB is under 30 MiB until remote `pg_database_size` can be measured. Storage is 86.99 MiB. Both fit internal 350 MiB/800 MiB targets with over 20% reserve. Production `.next` excluding cache/dev is 24,402,011 B.

## Verification

- Next build: 19 dynamic app route entries plus Proxy; local and Vercel builds pass.
- Vercel Preview: `dpl_77LYFx6h3YJvoupfBcCWfP1D3hXM`, status `READY`; Deployment Protection enabled.
- Preview routes `/`, `/catalog`, `/calculator`, `/cart`, `/checkout`, `/portfolio`, `/admin/login`, `/api/health` return through authenticated `vercel curl`.
- Vercel output: 48 lambda entries grouped into 3 deployed functions, 2,676,300 unique function bytes.
- Unit: 3 files/11 tests pass for money, phone, WhatsApp and security helpers.
- ETL/schema static: 14 tests pass; transformed categories/materials 19/1,428; duplicates 0; repeat `NO_OP`.
- Media verification: 1,371 objects, deferred 0, repeat `NO_OP`; cloud object check deferred.
- Disposable PostgreSQL: migration applies; anon base-table read and order insert denied; safe public view allowed; service-role order RPC works without legacy GUC; authoritative 2-unit total is 300,000 kopecks.
- Browser: Chromium plus 375 px project run, 7 pass/1 intentional project skip; hydration/CSP, safe empty state, same-origin denial, non-enumerable request and no horizontal overflow covered.
- CSP inspection: 15 scripts on dynamic cart response all carry the matching nonce.
- Secrets: repository scan passes; generated artifact canaries absent; `.next/static` has no service-role marker/client.
- Supply chain: production audit reports no known vulnerabilities; patched Sharp 0.35.0 and Nanoid override are locked.
- TypeScript, ESLint and Phase 2A scope checks pass.
- Backup commands fail closed without credentials; restore procedure covers SQL, media manifest/files and environment reconstruction. No automatic backup is claimed.

## Manual activation boundary

Create the Supabase project, provide URL/publishable/service-role values outside Git, push migrations, verify cloud Auth settings, create the first OWNER, upload/import media/data, run remote verification twice and execute the first manual backup. Then add separated Preview/Production variables in Vercel and repeat protected route/Auth/order/storage tests.

The current Preview intentionally has no Supabase variables and shows safe empty/unavailable states. Vercel Hobby is not claimed for commercial production; production requires an eligible plan plus unresolved privacy/legal decisions. Final premium redesign, client accounts, photo upload and AI were not started.
