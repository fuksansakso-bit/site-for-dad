-- Phase 2A simplified Supabase schema.
-- OWNER-DECISION-021/022; ADR-0013; QG-491-495.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.staff_role as enum ('OWNER', 'ADMIN', 'MANAGER');
create type public.pricing_mode as enum ('AREA', 'FIXED', 'MANUAL');
create type public.material_availability as enum ('AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY');
create type public.order_pricing_status as enum ('KNOWN', 'PARTIAL', 'MANUAL');
create type public.order_status as enum ('NEW', 'IN_REVIEW', 'CONTACTED', 'COMPLETED', 'CANCELLED');

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 160),
  role public.staff_role not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text not null unique check (char_length(legacy_source_id) between 1 and 512),
  name text not null check (char_length(name) between 1 and 255),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text not null unique check (char_length(legacy_source_id) between 1 and 512),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 255),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  article text not null check (char_length(article) between 1 and 128),
  description text,
  color_name text,
  normalized_color text,
  material_type text,
  price_category text,
  price_per_m2_kopecks integer,
  fixed_price_kopecks integer,
  minimum_price_kopecks integer,
  pricing_mode public.pricing_mode not null default 'MANUAL',
  availability public.material_availability not null default 'INQUIRY_ONLY',
  is_published boolean not null default false,
  primary_image_path text,
  source_name text not null default 'AMIGO',
  source_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_pricing_shape check (
    (pricing_mode = 'AREA' and price_per_m2_kopecks > 0 and fixed_price_kopecks is null and minimum_price_kopecks >= 150000)
    or (pricing_mode = 'FIXED' and fixed_price_kopecks > 0 and price_per_m2_kopecks is null and minimum_price_kopecks is null)
    or (pricing_mode = 'MANUAL' and price_per_m2_kopecks is null and fixed_price_kopecks is null and minimum_price_kopecks is null)
  )
);
create index materials_public_category_order_idx on public.materials(category_id, is_published, sort_order, id);
create index materials_article_idx on public.materials(article);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text unique,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 255),
  pricing_mode public.pricing_mode not null,
  price_per_m2_kopecks integer,
  fixed_price_kopecks integer,
  minimum_price_kopecks integer,
  width_rounding_mm integer check (width_rounding_mm is null or width_rounding_mm > 0),
  height_rounding_mm integer check (height_rounding_mm is null or height_rounding_mm > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_rules_shape check (
    (pricing_mode = 'AREA' and price_per_m2_kopecks > 0 and fixed_price_kopecks is null and minimum_price_kopecks >= 150000)
    or (pricing_mode = 'FIXED' and fixed_price_kopecks > 0 and price_per_m2_kopecks is null and minimum_price_kopecks is null)
    or (pricing_mode = 'MANUAL' and price_per_m2_kopecks is null and fixed_price_kopecks is null and minimum_price_kopecks is null)
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text unique,
  public_reference text not null unique default encode(gen_random_bytes(24), 'hex') check (public_reference ~ '^[0-9a-f]{48}$'),
  request_number text not null unique check (request_number ~ '^REQ-[0-9]{8}-[0-9A-Z]{6}$'),
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  customer_phone text not null check (customer_phone ~ '^\+7[0-9]{10}$'),
  locality text not null check (char_length(locality) between 1 and 160),
  address text check (address is null or char_length(address) <= 500),
  comment text check (comment is null or char_length(comment) <= 2000),
  internal_note text check (internal_note is null or char_length(internal_note) <= 4000),
  measurement_requested boolean not null default false,
  installment_interest boolean not null default false,
  pricing_status public.order_pricing_status not null,
  known_total_kopecks bigint check (known_total_kopecks is null or known_total_kopecks >= 0),
  status public.order_status not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_shape check (
    (pricing_status = 'KNOWN' and known_total_kopecks is not null)
    or (pricing_status in ('PARTIAL', 'MANUAL'))
  )
);
create index orders_status_created_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  material_id uuid references public.materials(id) on delete set null,
  material_name_snapshot text not null,
  article_snapshot text not null,
  pricing_mode_snapshot public.pricing_mode not null,
  price_per_m2_kopecks_snapshot integer,
  fixed_price_kopecks_snapshot integer,
  minimum_price_kopecks_snapshot integer,
  width_mm integer not null check (width_mm between 100 and 10000),
  height_mm integer not null check (height_mm between 100 and 10000),
  quantity integer not null check (quantity between 1 and 100),
  unit_price_kopecks bigint check (unit_price_kopecks is null or unit_price_kopecks >= 0),
  total_price_kopecks bigint check (total_price_kopecks is null or total_price_kopecks >= 0),
  pricing_status public.order_pricing_status not null,
  created_at timestamptz not null default now(),
  constraint order_item_total check (
    (pricing_status = 'KNOWN' and unit_price_kopecks is not null and total_price_kopecks = unit_price_kopecks * quantity)
    or (pricing_status <> 'KNOWN' and unit_price_kopecks is null and total_price_kopecks is null)
  )
);
create index order_items_order_idx on public.order_items(order_id, created_at, id);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id text unique,
  title text not null check (char_length(title) between 1 and 255),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  cover_image_path text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'PROJECT_NAME',
  logo_path text,
  partner_badge_path text,
  whatsapp_phone text not null default '79635851036' check (whatsapp_phone ~ '^7[0-9]{10}$'),
  phone text not null default '+79635851036' check (phone ~ '^\+7[0-9]{10}$'),
  region text not null default 'Чеченская Республика',
  lead_time_text text not null default '2–7 календарных дней',
  warranty_text text not null default '12 месяцев',
  free_measurement boolean not null default true,
  free_delivery boolean not null default true,
  free_installation boolean not null default true,
  installment_text text not null default 'Доступна рассрочка. Уточните условия у менеджера',
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_display_name text,
  action text not null check (char_length(action) between 1 and 120),
  entity text not null check (char_length(entity) between 1 and 120),
  entity_id text,
  safe_diff jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_diff) = 'object'),
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit_log(created_at desc);

create table public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  source_fingerprint text not null,
  transform_fingerprint text not null,
  result_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_fingerprint, transform_fingerprint)
);

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function private.touch_updated_at() from public;

create trigger staff_profiles_touch before update on public.staff_profiles for each row execute function private.touch_updated_at();
create trigger categories_touch before update on public.categories for each row execute function private.touch_updated_at();
create trigger materials_touch before update on public.materials for each row execute function private.touch_updated_at();
create trigger pricing_rules_touch before update on public.pricing_rules for each row execute function private.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();
create trigger portfolio_items_touch before update on public.portfolio_items for each row execute function private.touch_updated_at();
create trigger site_settings_touch before update on public.site_settings for each row execute function private.touch_updated_at();

create or replace function private.current_staff_role() returns public.staff_role
language sql stable security definer set search_path = '' as $$
  select sp.role from public.staff_profiles sp
  where sp.auth_user_id = (select auth.uid()) and sp.is_active
  limit 1
$$;
revoke all on function private.current_staff_role() from public;
grant execute on function private.current_staff_role() to authenticated;

create or replace function private.protect_last_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'OWNER' and old.is_active and
     (tg_op = 'DELETE' or new.role <> 'OWNER' or not new.is_active) and
     not exists (select 1 from public.staff_profiles p where p.id <> old.id and p.role = 'OWNER' and p.is_active)
  then raise exception using errcode = '23514', message = 'LAST_OWNER_PROTECTED'; end if;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
revoke all on function private.protect_last_owner() from public;
create trigger staff_profiles_last_owner before update or delete on public.staff_profiles for each row execute function private.protect_last_owner();

create or replace function private.prevent_order_item_mutation() returns trigger
language plpgsql set search_path = '' as $$ begin raise exception using errcode='23514', message='ORDER_ITEM_IMMUTABLE'; end $$;
revoke all on function private.prevent_order_item_mutation() from public;
create trigger order_items_immutable before update or delete on public.order_items for each row execute function private.prevent_order_item_mutation();

alter table public.staff_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.materials enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.migration_runs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.materials, public.portfolio_items, public.site_settings to anon, authenticated;
grant select, insert, update on public.categories, public.materials, public.pricing_rules, public.portfolio_items, public.site_settings to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.admin_audit_log, public.staff_profiles to authenticated;
grant insert on public.admin_audit_log to authenticated;
grant select, insert, update, delete on public.staff_profiles to authenticated;

create policy categories_public_read on public.categories for select to anon, authenticated using (is_published or private.current_staff_role() is not null);
create policy materials_public_read on public.materials for select to anon, authenticated using (is_published or private.current_staff_role() is not null);
create policy portfolio_public_read on public.portfolio_items for select to anon, authenticated using (is_published or private.current_staff_role() is not null);
create policy settings_public_read on public.site_settings for select to anon, authenticated using (true);

create policy catalog_admin_all on public.categories for all to authenticated using (private.current_staff_role() in ('OWNER','ADMIN')) with check (private.current_staff_role() in ('OWNER','ADMIN'));
create policy materials_admin_all on public.materials for all to authenticated using (private.current_staff_role() in ('OWNER','ADMIN')) with check (private.current_staff_role() in ('OWNER','ADMIN'));
create policy pricing_admin_all on public.pricing_rules for all to authenticated using (private.current_staff_role() in ('OWNER','ADMIN')) with check (private.current_staff_role() in ('OWNER','ADMIN'));
create policy portfolio_staff_all on public.portfolio_items for all to authenticated using (private.current_staff_role() in ('OWNER','ADMIN')) with check (private.current_staff_role() in ('OWNER','ADMIN'));
create policy settings_admin_all on public.site_settings for all to authenticated using (private.current_staff_role() in ('OWNER','ADMIN')) with check (private.current_staff_role() in ('OWNER','ADMIN'));
create policy orders_staff_read on public.orders for select to authenticated using (private.current_staff_role() is not null);
create policy orders_staff_update on public.orders for update to authenticated using (private.current_staff_role() is not null) with check (private.current_staff_role() is not null);
create policy order_items_staff_read on public.order_items for select to authenticated using (private.current_staff_role() is not null);
create policy audit_staff_read on public.admin_audit_log for select to authenticated using (private.current_staff_role() in ('OWNER','ADMIN'));
create policy audit_staff_insert on public.admin_audit_log for insert to authenticated with check (private.current_staff_role() is not null and actor_auth_user_id = auth.uid());
create policy staff_read on public.staff_profiles for select to authenticated using (private.current_staff_role() is not null);
create policy staff_owner_write on public.staff_profiles for all to authenticated using (private.current_staff_role() = 'OWNER') with check (private.current_staff_role() = 'OWNER');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('catalog','catalog',true,8388608,array['image/webp']),
  ('portfolio','portfolio',true,8388608,array['image/webp','image/jpeg','image/png']),
  ('branding','branding',true,4194304,array['image/webp','image/svg+xml','image/png'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_public_read on storage.objects for select to anon, authenticated using (bucket_id in ('catalog','portfolio','branding'));
create policy storage_staff_insert on storage.objects for insert to authenticated with check (bucket_id in ('catalog','portfolio','branding') and private.current_staff_role() in ('OWNER','ADMIN'));
create policy storage_staff_update on storage.objects for update to authenticated using (bucket_id in ('catalog','portfolio','branding') and private.current_staff_role() in ('OWNER','ADMIN')) with check (bucket_id in ('catalog','portfolio','branding') and private.current_staff_role() in ('OWNER','ADMIN'));
create policy storage_staff_delete on storage.objects for delete to authenticated using (bucket_id in ('catalog','portfolio','branding') and private.current_staff_role() in ('OWNER','ADMIN'));

create or replace function public.phase2a_import(p_payload jsonb, p_source_fingerprint text, p_transform_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing jsonb; c jsonb; m jsonb; imported_categories int := 0; imported_materials int := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' then raise exception using errcode='42501', message='SERVICE_ROLE_REQUIRED'; end if;
  select mr.result_counts into existing from public.migration_runs mr where mr.source_fingerprint=p_source_fingerprint and mr.transform_fingerprint=p_transform_fingerprint;
  if existing is not null then return existing || jsonb_build_object('noOp',true); end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload->'categories') <> 'array' or jsonb_typeof(p_payload->'materials') <> 'array' then raise exception using errcode='22023',message='INVALID_IMPORT_PAYLOAD'; end if;
  for c in select value from jsonb_array_elements(p_payload->'categories') loop
    insert into public.categories(legacy_source_id,name,slug,description,image_path,sort_order,is_published)
    values(c->>'legacySourceId',c->>'name',c->>'slug',nullif(c->>'description',''),nullif(c->>'imagePath',''),coalesce((c->>'sortOrder')::int,0),coalesce((c->>'isPublished')::boolean,false))
    on conflict(legacy_source_id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,image_path=excluded.image_path,sort_order=excluded.sort_order,is_published=excluded.is_published;
    imported_categories := imported_categories + 1;
  end loop;
  for m in select value from jsonb_array_elements(p_payload->'materials') loop
    insert into public.materials(legacy_source_id,category_id,name,slug,article,description,color_name,normalized_color,material_type,price_category,price_per_m2_kopecks,fixed_price_kopecks,minimum_price_kopecks,pricing_mode,availability,is_published,primary_image_path,source_name,source_url,sort_order)
    select m->>'legacySourceId',c.id,m->>'name',m->>'slug',m->>'article',nullif(m->>'description',''),nullif(m->>'colorName',''),nullif(m->>'normalizedColor',''),nullif(m->>'materialType',''),nullif(m->>'priceCategory',''),nullif(m->>'pricePerM2Kopecks','')::int,nullif(m->>'fixedPriceKopecks','')::int,nullif(m->>'minimumPriceKopecks','')::int,(m->>'pricingMode')::public.pricing_mode,(m->>'availability')::public.material_availability,coalesce((m->>'isPublished')::boolean,false),nullif(m->>'primaryImagePath',''),coalesce(nullif(m->>'sourceName',''),'AMIGO'),nullif(m->>'sourceUrl',''),coalesce((m->>'sortOrder')::int,0)
    from public.categories c where c.legacy_source_id=m->>'categoryLegacySourceId'
    on conflict(legacy_source_id) do update set category_id=excluded.category_id,name=excluded.name,slug=excluded.slug,article=excluded.article,description=excluded.description,color_name=excluded.color_name,normalized_color=excluded.normalized_color,material_type=excluded.material_type,price_category=excluded.price_category,price_per_m2_kopecks=excluded.price_per_m2_kopecks,fixed_price_kopecks=excluded.fixed_price_kopecks,minimum_price_kopecks=excluded.minimum_price_kopecks,pricing_mode=excluded.pricing_mode,availability=excluded.availability,is_published=excluded.is_published,primary_image_path=excluded.primary_image_path,source_name=excluded.source_name,source_url=excluded.source_url,sort_order=excluded.sort_order;
    if not found then raise exception using errcode='23503',message='IMPORT_CATEGORY_NOT_FOUND'; end if;
    imported_materials := imported_materials + 1;
  end loop;
  existing := jsonb_build_object('categories',imported_categories,'materials',imported_materials,'noOp',false);
  insert into public.migration_runs(source_fingerprint,transform_fingerprint,result_counts) values(p_source_fingerprint,p_transform_fingerprint,existing);
  return existing;
end $$;
revoke all on function public.phase2a_import(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.phase2a_import(jsonb,text,text) to service_role;

insert into public.site_settings(id) values(true) on conflict(id) do nothing;
