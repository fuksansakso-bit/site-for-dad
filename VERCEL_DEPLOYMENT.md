# Vercel Preview handoff

Phase 2C is delivered through the GitHub repository
`https://github.com/fuksansakso-bit/site-for-dad.git`, branch
`phase/2c-final-premium-design`, and the unmerged Draft PR titled
`Phase 2C: final premium design, motion and ergonomics` at
`https://github.com/fuksansakso-bit/site-for-dad/pull/1`.

The Vercel project must import that repository under the intended
`fuksansakso` account/team and use `apps/web` as Root Directory. The directory
contains its own frozen pnpm workspace/lockfile and `vercel.json`; install is
`pnpm install --frozen-lockfile`, build is `pnpm build`, framework is Next.js
and output is `.next`.

Preview variables are configured in Vercel, never committed. The runtime set
must include the public site/Supabase variables, server-only service-role key
and the configured AI/retention/cron variables listed in `.env.example`.
`SUPABASE_SERVICE_ROLE_KEY`, `POLZA_AI_API_KEY`, database credentials and
`CRON_SECRET` must never use `NEXT_PUBLIC_`, enter logs or reach client chunks.
Preview should use the explicitly approved Supabase project; Production values
remain independently scoped.

The historical deployment under `bataevabdullah2009-9137` is not Phase 2C
evidence and must not be promoted or used for this review. The target-account
Git integration produced a Ready branch Preview at
`https://site-for-dad-web-git-phase-2c-6ee1fa-fuksansakso-2848s-projects.vercel.app`.
The Product Owner explicitly reserved direct Preview inspection. Therefore the
URL/Ready portion is recorded, direct smoke is not claimed, QG-666 remains open
and each pushed branch update must finish rebuilding before owner review.

No `vercel --prod`, promotion, production alias/domain assignment or merge is
authorized. Commercial plan, final brand/legal/privacy content, the remaining
multi-family Polza quality matrix and an isolated restore drill remain
production gates.
