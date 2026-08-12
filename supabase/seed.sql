-- Safe local seed: business settings only. Staff users are created through Supabase Auth bootstrap.
insert into public.site_settings(id, site_name)
values (true, 'PROJECT_NAME')
on conflict (id) do nothing;
