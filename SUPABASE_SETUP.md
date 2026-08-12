# Supabase setup

1. Создать отдельные development и production projects; production не активировать до закрытия privacy/legal gates.
2. Скопировать `.env.example` в ignored `.env.local` и заполнить URL, publishable key и server-only service-role key. Ключи не отправлять в чат и Git.
3. Выполнить `pnpm exec supabase link --project-ref <ref>` и `pnpm exec supabase db push` из доверенной операторской среды.
4. Миграции создают таблицы, RLS и buckets `catalog`, `portfolio`, `branding`. Проверить SQL/RLS tests до импорта.
5. Запустить по порядку: `pnpm migration:audit`, `migration:export`, `migration:transform`, `migration:optimize-media`, `migration:upload-media`, `migration:import`, `migration:verify`, `migration:verify-media -- --remote`.
6. В Auth Settings отключить public email signup и anonymous sign-in, установить минимум пароля 12 символов с upper/lower/digits/symbols и secure password change; значения `supabase/config.toml` являются проверяемым шаблоном, но cloud Dashboard MUST быть сверен отдельно.
7. Первый OWNER: создать email/password пользователя в Supabase Auth dashboard без передачи пароля через репозиторий; затем в SQL Editor выполнить `insert into public.staff_profiles(auth_user_id,display_name,role,is_active,must_change_password) values ('<auth-user-uuid>','Владелец','OWNER',true,false);`. Войти на `/admin/login` и проверить роль. Последнего OWNER удалить/отключить нельзя.
8. Нормальный запуск: `pnpm install`, затем `pnpm dev`; Docker не нужен. Supabase local CLI/Docker остаётся только optional test workflow.

Cloud credentials в Phase 2A workspace не обнаружены: remote migrations/import/Auth login не объявляются выполненными.
