# Vercel deployment

Проект — стандартный Next.js App Router в `apps/web`. Root command: `pnpm build`; install: `pnpm install --frozen-lockfile`; output определяется Next.js автоматически.

В Vercel создать проект из существующего GitHub repository, задать Root Directory `.` и переменные отдельно для Preview/Production: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Service-role secret не должен иметь `NEXT_PUBLIC_`, попадать в build logs или клиентский bundle. Preview использует отдельный development Supabase project.

Preview deployment `dpl_77LYFx6h3YJvoupfBcCWfP1D3hXM` имеет статус `READY`: `https://web-7dbmsauwz-bataevabdullah2009-9137s-projects.vercel.app`. Deployment Protection включён; восемь маршрутов проверены через authenticated `vercel curl`. Supabase variables не заданы, поэтому Preview показывает безопасные empty states и не считается cloud activation.

Production aliases/domain назначаются только после import/RLS/Auth/backup/legal gates. Vercel Hobby не используется для коммерческого production; требуется план, разрешающий коммерческое применение. Для CLI из корня используется `vercel deploy --cwd apps/web --archive=tgz`; Git integration должна брать Root Directory `apps/web`.
