-- OWNER-DECISION-025; ADR-0015; FR-CALC-025..031.

create table if not exists public.amigo_price_versions (
  source_version text primary key check (source_version ~ '^amigo-[0-9a-f]{16}$'),
  semantic_sha256 text not null unique check (semantic_sha256 ~ '^[0-9a-f]{64}$'),
  shop_origin text not null check (shop_origin = 'https://shop.amigo.ru'),
  calculator_origin text not null check (calculator_origin = 'https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru'),
  captured_at timestamptz not null,
  is_active boolean not null default false,
  ready_count integer not null check (ready_count > 0),
  row_count integer not null check (row_count >= ready_count),
  created_at timestamptz not null default now()
);
create unique index if not exists amigo_price_versions_one_active_idx
  on public.amigo_price_versions(is_active) where is_active;

alter table public.materials
  add column if not exists amigo_from_price_kopecks integer,
  add column if not exists amigo_from_price_label text,
  add column if not exists amigo_price_version text references public.amigo_price_versions(source_version) on delete restrict,
  add column if not exists amigo_price_captured_at timestamptz,
  add column if not exists amigo_card_source_id text,
  add column if not exists amigo_calculator_origin text,
  add column if not exists amigo_calculator_model_id integer,
  add column if not exists amigo_calculator_material_id integer,
  add column if not exists amigo_calculator_material_name text,
  add column if not exists amigo_calculator_vendor_code text,
  add column if not exists amigo_mapping_status text,
  add column if not exists catalog_group_slug text,
  add column if not exists catalog_group_name text;

alter table public.materials drop constraint if exists materials_pricing_shape;
alter table public.materials add constraint materials_pricing_shape check (
  (pricing_mode = 'AREA' and price_per_m2_kopecks > 0 and fixed_price_kopecks is null and minimum_price_kopecks > 0)
  or (pricing_mode = 'FIXED' and fixed_price_kopecks > 0 and price_per_m2_kopecks is null and minimum_price_kopecks is null)
  or (pricing_mode = 'MANUAL' and price_per_m2_kopecks is null and fixed_price_kopecks is null and minimum_price_kopecks is null)
  or (
    pricing_mode = 'AMIGO_EXACT'
    and price_per_m2_kopecks is null and fixed_price_kopecks is null and minimum_price_kopecks is null
    and amigo_from_price_kopecks > 0
    and amigo_price_version is not null
    and amigo_price_captured_at is not null
    and amigo_card_source_id is not null
    and amigo_calculator_origin = 'https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru'
    and amigo_calculator_model_id > 0 and amigo_calculator_material_id > 0
    and amigo_mapping_status = 'READY'
    and catalog_group_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(catalog_group_name) between 1 and 255
  )
);

create table if not exists public.amigo_calculation_cache (
  source_version text not null references public.amigo_price_versions(source_version) on delete restrict,
  calculator_model_id integer not null check (calculator_model_id > 0),
  calculator_material_id integer not null check (calculator_material_id > 0),
  width_mm integer not null check (width_mm between 100 and 10000),
  height_mm integer not null check (height_mm between 100 and 10000),
  unit_price_kopecks bigint not null check (unit_price_kopecks > 0),
  calculated_at timestamptz not null default now(),
  primary key(source_version, calculator_model_id, calculator_material_id, width_mm, height_mm)
);

alter table public.order_items
  add column if not exists amigo_price_version_snapshot text,
  add column if not exists amigo_calculator_model_id_snapshot integer,
  add column if not exists amigo_calculator_material_id_snapshot integer;

drop view if exists public.public_materials;
drop view if exists public.public_categories;

create view public.public_materials with (security_barrier=true) as
select m.name,m.slug,m.article,m.description,m.color_name,m.material_type,m.primary_image_path,
  m.catalog_group_name as category_name,m.catalog_group_slug as category_slug,m.sort_order,
  case m.availability
    when 'AVAILABLE' then 'В наличии'
    when 'OUT_OF_STOCK' then 'Нет в наличии'
    else 'Доступно к заказу'
  end as availability_label,
  m.amigo_from_price_kopecks as display_price_kopecks,
  'от'::text as display_price_suffix
from public.materials m
join public.categories c on c.id=m.category_id
join public.amigo_price_versions v on v.source_version=m.amigo_price_version and v.is_active
where m.is_published and c.is_published and m.pricing_mode='AMIGO_EXACT'
  and m.amigo_mapping_status='READY' and m.primary_image_path is not null;

create view public.public_categories with (security_barrier=true) as
select group_name as name,group_slug as slug,max(description) as description,max(image_path) as image_path,min(sort_order) as sort_order
from (
  select m.catalog_group_name as group_name,m.catalog_group_slug as group_slug,
    c.description,c.image_path,c.sort_order
  from public.materials m
  join public.categories c on c.id=m.category_id
  join public.amigo_price_versions v on v.source_version=m.amigo_price_version and v.is_active
  where m.is_published and c.is_published and m.pricing_mode='AMIGO_EXACT'
    and m.amigo_mapping_status='READY' and m.primary_image_path is not null
) available
group by group_name,group_slug;

revoke all on public.amigo_price_versions, public.amigo_calculation_cache from public, anon, authenticated;
grant select on public.public_categories, public.public_materials to anon, authenticated;
grant select on public.amigo_price_versions, public.amigo_calculation_cache to service_role;
grant insert on public.amigo_calculation_cache to service_role;

alter table public.amigo_price_versions enable row level security;
alter table public.amigo_calculation_cache enable row level security;

create or replace function private.prevent_amigo_price_version_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.is_active and new.is_active and (to_jsonb(old) - 'is_active') <> (to_jsonb(new) - 'is_active') then
    raise exception using errcode='23514', message='AMIGO_PRICE_VERSION_IMMUTABLE';
  end if;
  return new;
end $$;
revoke all on function private.prevent_amigo_price_version_mutation() from public;
drop trigger if exists amigo_price_versions_immutable on public.amigo_price_versions;
create trigger amigo_price_versions_immutable before update on public.amigo_price_versions
for each row execute function private.prevent_amigo_price_version_mutation();

create or replace function public.create_order_from_server(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_order_id uuid;
  v_public_reference text;
  v_request_number text := 'REQ-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  v_item jsonb;
  v_material public.materials%rowtype;
  v_width integer;
  v_height integer;
  v_quantity integer;
  v_unit bigint;
  v_total bigint;
  v_known_total bigint := 0;
  v_ai_job_id uuid;
  v_guest_session_hash text := nullif(p_payload->>'aiGuestSessionHash', '');
begin
  if jsonb_typeof(p_payload) <> 'object'
    or jsonb_typeof(p_payload->'items') <> 'array'
    or jsonb_array_length(p_payload->'items') not between 1 and 50
    or coalesce(p_payload->>'customerName','') !~ '^.{1,160}$'
    or coalesce(p_payload->>'customerPhone','') !~ '^\+7[0-9]{10}$'
    or coalesce(p_payload->>'locality','') !~ '^.{1,160}$'
    or char_length(coalesce(p_payload->>'address','')) > 500
    or char_length(coalesce(p_payload->>'comment','')) > 2000
    or (v_guest_session_hash is not null and v_guest_session_hash !~ '^[0-9a-f]{64}$')
  then raise exception using errcode='22023', message='INVALID_ORDER_PAYLOAD'; end if;

  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    begin
      v_width := (v_item->>'widthMm')::integer;
      v_height := (v_item->>'heightMm')::integer;
      v_quantity := (v_item->>'quantity')::integer;
      v_unit := (v_item->>'unitPriceKopecks')::bigint;
    exception when others then raise exception using errcode='22023',message='INVALID_ORDER_ITEM'; end;
    if v_width not between 100 and 10000 or v_height not between 100 and 10000
      or v_quantity not between 1 and 100 or v_unit <= 0
    then raise exception using errcode='22023',message='INVALID_ORDER_ITEM'; end if;
    select m.* into strict v_material from public.materials m
    join public.categories c on c.id=m.category_id
    join public.amigo_price_versions pv on pv.source_version=m.amigo_price_version and pv.is_active
    where m.slug=v_item->>'materialSlug' and m.is_published and c.is_published
      and m.pricing_mode='AMIGO_EXACT' and m.amigo_mapping_status='READY' for share of m;
    if v_item->>'priceSourceVersion' <> v_material.amigo_price_version
      or (v_item->>'calculatorModelId')::integer <> v_material.amigo_calculator_model_id
      or (v_item->>'calculatorMaterialId')::integer <> v_material.amigo_calculator_material_id
      or not exists (
        select 1 from public.amigo_calculation_cache cache
        where cache.source_version=v_material.amigo_price_version
          and cache.calculator_model_id=v_material.amigo_calculator_model_id
          and cache.calculator_material_id=v_material.amigo_calculator_material_id
          and cache.width_mm=v_width and cache.height_mm=v_height and cache.unit_price_kopecks=v_unit
      )
    then raise exception using errcode='22023',message='PRICE_FACT_NOT_VERIFIED'; end if;
    v_known_total := v_known_total + v_unit*v_quantity;
  end loop;

  insert into public.orders(request_number,customer_name,customer_phone,locality,address,comment,measurement_requested,installment_interest,pricing_status,known_total_kopecks)
  values(v_request_number,p_payload->>'customerName',p_payload->>'customerPhone',p_payload->>'locality',nullif(p_payload->>'address',''),nullif(p_payload->>'comment',''),coalesce((p_payload->>'measurementRequested')::boolean,false),coalesce((p_payload->>'installmentInterest')::boolean,false),'KNOWN',v_known_total)
  returning id,public_reference into v_order_id,v_public_reference;

  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    v_width := (v_item->>'widthMm')::integer; v_height := (v_item->>'heightMm')::integer;
    v_quantity := (v_item->>'quantity')::integer; v_unit := (v_item->>'unitPriceKopecks')::bigint;
    v_total := v_unit*v_quantity;
    select m.* into strict v_material from public.materials m where m.slug=v_item->>'materialSlug';
    v_ai_job_id := null;
    if v_guest_session_hash is not null and nullif(v_item->>'aiVisualizationJobId','') is not null then
      begin
        select j.id into v_ai_job_id from public.ai_visualization_jobs j
        where j.id=(v_item->>'aiVisualizationJobId')::uuid and j.guest_session_hash=v_guest_session_hash
          and j.material_id=v_material.id and j.status in ('SUCCEEDED','EXPIRED','DELETED') limit 1;
      exception when invalid_text_representation then v_ai_job_id := null; end;
    end if;
    insert into public.order_items(order_id,material_id,ai_visualization_job_id,material_name_snapshot,article_snapshot,pricing_mode_snapshot,price_per_m2_kopecks_snapshot,fixed_price_kopecks_snapshot,minimum_price_kopecks_snapshot,width_mm,height_mm,quantity,unit_price_kopecks,total_price_kopecks,pricing_status,amigo_price_version_snapshot,amigo_calculator_model_id_snapshot,amigo_calculator_material_id_snapshot)
    values(v_order_id,v_material.id,v_ai_job_id,v_material.name,v_material.article,v_material.pricing_mode,null,null,null,v_width,v_height,v_quantity,v_unit,v_total,'KNOWN',v_material.amigo_price_version,v_material.amigo_calculator_model_id,v_material.amigo_calculator_material_id);
  end loop;
  return jsonb_build_object('publicReference',v_public_reference,'requestNumber',v_request_number,'status','NEW','pricingStatus','KNOWN','knownTotalKopecks',v_known_total);
exception when no_data_found then raise exception using errcode='22023',message='MATERIAL_NOT_AVAILABLE';
end $$;
revoke all on function public.create_order_from_server(jsonb) from public, anon, authenticated;
grant execute on function public.create_order_from_server(jsonb) to service_role;
