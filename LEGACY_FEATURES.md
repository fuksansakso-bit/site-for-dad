# Legacy features after Phase 2A

This inventory preserves architectural history without keeping retired systems in the active Next.js build or Vercel deployment. Git history and tag `pre-supabase-vercel-migration` are the recovery source; source PostgreSQL and object-storage data are retained separately until migration verification.

## Removed from active runtime

| Legacy capability                             | Historical location                                            | Phase 2A disposition                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Prisma schema and 25+ migrations              | `packages/db`                                                  | Replaced by minimal SQL in `supabase/migrations`; historical schema is not imported one-to-one.                               |
| Native/self-managed PostgreSQL lifecycle      | `.local`, `tooling/scripts/foundation-environment.ps1`         | Not required by `pnpm dev`; old database remains read-only migration evidence.                                                |
| Graphile Worker and separate process          | `apps/worker`, `packages/jobs`                                 | Removed; Phase 2A has no permanent worker or long serverless job.                                                             |
| VersityGW/S3 adapter                          | `packages/storage`, `infrastructure/local/compose.storage.yml` | Replaced by Supabase Storage buckets and policies.                                                                            |
| Mailpit/OTP/custom staff sessions             | notification and identity packages, `/login`                   | Replaced by Supabase Auth e-mail/password at `/admin/login`; old credentials are not migrated.                                |
| Full AMIGO discovery/scraping/sync            | catalog importer, admin sync routes                            | Disabled. Approved local records are migrated once; no runtime AMIGO request exists.                                          |
| CatalogVersion/PriceVersion review pipeline   | catalog/pricing/db packages                                    | Historical evidence retained; simple audited material/rule rows serve Phase 2A.                                               |
| Complex multi-step configurator               | `/configure` and configurator APIs                             | Replaced by category/material/dimensions/quantity calculator.                                                                 |
| Deterministic standard preview                | `/preview`, `packages/preview`, preview APIs/assets            | Removed from public navigation and active deployment.                                                                         |
| AI/Polza/Gemini/SAM/Python boundaries         | future documentation only                                      | Not implemented and not started.                                                                                              |
| Server-side guest cart/QuoteSnapshot workflow | cart routes and database adapter                               | Replaced by localStorage identity/dimensions/quantity plus mandatory server recalculation and immutable order-item snapshots. |
| Customer account concepts                     | historical specifications only                                 | Still absent; no registration, `/account` or customer authentication.                                                         |
| VPS production Compose/Nginx topology         | Phase 1F.1 planned templates                                   | Superseded by portable standard Next.js and optional managed hosting instructions.                                            |

## Principles retained

- approved AMIGO provenance, partner rights, local publication control and no hotlink/training use;
- stable material identity independent of a non-unique article;
- integer kopecks, server price authority, 1,500 ₽ per independently manufactured item and honest manual-price fallback;
- immutable request/item snapshots, safe public references and truthful WhatsApp handoff;
- named OWNER/ADMIN/MANAGER staff, server authorization, last-OWNER protection and safe audit diff;
- no customer accounts, payment, client-photo upload, AI or final premium redesign in Phase 2A.

## Recovery boundary

Legacy code is not copied into a second deployable application. To inspect it, use Git history or the safety tag. Do not delete the old PostgreSQL data directory or Docker volumes until source dump, checksums, transformed import and repeat verification have all passed and the owner separately authorizes retirement.
