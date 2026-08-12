-- Phase 2B private AI visualization lifecycle.
-- OWNER-DECISION-023; ADR-0014; P2B-AI-001..015.

create type public.ai_visualization_status as enum (
  'CREATED',
  'UPLOAD_PENDING',
  'READY',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'DELETED'
);

create type public.ai_visualization_attempt_status as enum (
  'RESERVED',
  'PROVIDER_CREATED',
  'SUCCEEDED',
  'FAILED',
  'REJECTED'
);

create table public.ai_visualization_jobs (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default
    (replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
    check (public_reference ~ '^[0-9a-f]{48}$'),
  guest_session_hash text not null check (guest_session_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  material_id uuid not null references public.materials(id) on delete restrict,
  input_storage_path text not null unique,
  result_storage_path text unique,
  input_sha256 text check (input_sha256 is null or input_sha256 ~ '^[0-9a-f]{64}$'),
  material_image_sha256 text check (material_image_sha256 is null or material_image_sha256 ~ '^[0-9a-f]{64}$'),
  combined_request_hash text check (combined_request_hash is null or combined_request_hash ~ '^[0-9a-f]{64}$'),
  result_sha256 text check (result_sha256 is null or result_sha256 ~ '^[0-9a-f]{64}$'),
  create_idempotency_hash text check (create_idempotency_hash is null or create_idempotency_hash ~ '^[0-9a-f]{64}$'),
  upload_idempotency_hash text check (upload_idempotency_hash is null or upload_idempotency_hash ~ '^[0-9a-f]{64}$'),
  status public.ai_visualization_status not null default 'CREATED',
  model_name text not null check (char_length(model_name) between 3 and 200),
  prompt_version text not null check (prompt_version ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  output_size text not null default '1K' check (output_size = '1K'),
  output_aspect_ratio text check (output_aspect_ratio in ('1:1', '9:16', '16:9')),
  attempt_number integer not null default 0 check (attempt_number between 0 and 20),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{2,80}$'),
  safe_error_message text check (safe_error_message is null or char_length(safe_error_message) <= 500),
  provider_request_id text unique check (provider_request_id is null or char_length(provider_request_id) between 3 and 200),
  provider_status text check (provider_status is null or char_length(provider_status) <= 80),
  provider_error_code text check (provider_error_code is null or provider_error_code ~ '^[A-Z0-9_]{2,80}$'),
  input_mime_type text check (input_mime_type is null or input_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  input_byte_size integer check (input_byte_size is null or input_byte_size between 1 and 4194304),
  input_width integer check (input_width is null or input_width between 320 and 2048),
  input_height integer check (input_height is null or input_height between 320 and 2048),
  material_image_mime_type text check (material_image_mime_type is null or material_image_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  material_image_byte_size integer check (material_image_byte_size is null or material_image_byte_size between 1 and 8388608),
  result_mime_type text check (result_mime_type is null or result_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  result_byte_size integer check (result_byte_size is null or result_byte_size between 1 and 10485760),
  consent_version text check (consent_version is null or consent_version ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  last_provider_poll_at timestamptz,
  cleanup_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ai_input_path_exact check (
    input_storage_path ~ ('^' || id::text || '/window\.(jpg|png|webp)$')
  ),
  constraint ai_result_path_exact check (
    result_storage_path is null
    or result_storage_path ~ ('^' || id::text || '/result\.(jpg|png|webp)$')
  ),
  constraint ai_job_time_order check (
    (started_at is null or started_at >= created_at)
    and (completed_at is null or started_at is not null)
    and (deleted_at is null or deleted_at >= created_at)
    and expires_at > created_at
  )
);

create unique index ai_jobs_one_active_guest_idx
  on public.ai_visualization_jobs(guest_session_hash)
  where status in ('CREATED', 'UPLOAD_PENDING', 'READY', 'PROCESSING');
create index ai_jobs_guest_created_idx on public.ai_visualization_jobs(guest_session_hash, created_at desc);
create index ai_jobs_status_created_idx on public.ai_visualization_jobs(status, created_at desc);
create index ai_jobs_expiry_idx on public.ai_visualization_jobs(expires_at, status)
  where status not in ('EXPIRED', 'DELETED');
create index ai_jobs_dedup_idx on public.ai_visualization_jobs(guest_session_hash, combined_request_hash, completed_at desc)
  where status = 'SUCCEEDED' and deleted_at is null;
create index ai_jobs_material_idx on public.ai_visualization_jobs(material_id, created_at desc);
create unique index ai_jobs_create_idempotency_idx
  on public.ai_visualization_jobs(guest_session_hash, create_idempotency_hash)
  where create_idempotency_hash is not null;

create table public.ai_visualization_attempts (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.ai_visualization_jobs(id) on delete restrict,
  guest_session_hash text not null check (guest_session_hash ~ '^[0-9a-f]{64}$'),
  attempt_number integer not null check (attempt_number between 1 and 20),
  idempotency_hash text not null check (idempotency_hash ~ '^[0-9a-f]{64}$'),
  status public.ai_visualization_attempt_status not null default 'RESERVED',
  model_name text not null check (char_length(model_name) between 3 and 200),
  provider_request_id text check (provider_request_id is null or char_length(provider_request_id) between 3 and 200),
  provider_error_code text check (provider_error_code is null or provider_error_code ~ '^[A-Z0-9_]{2,80}$'),
  safe_diagnostic text check (safe_diagnostic is null or char_length(safe_diagnostic) <= 500),
  created_at timestamptz not null default now(),
  provider_created_at timestamptz,
  finished_at timestamptz,
  unique (job_id, attempt_number),
  unique (guest_session_hash, idempotency_hash)
);
create index ai_attempts_created_idx on public.ai_visualization_attempts(created_at desc);
create index ai_attempts_job_idx on public.ai_visualization_attempts(job_id, attempt_number desc);

create table public.ai_visualizer_settings (
  id boolean primary key default true check (id),
  is_enabled boolean not null default false,
  max_attempts_per_guest_per_day integer not null default 2 check (max_attempts_per_guest_per_day between 1 and 20),
  global_daily_job_limit integer not null default 20 check (global_daily_job_limit between 1 and 1000),
  max_concurrent_jobs integer not null default 1 check (max_concurrent_jobs between 1 and 20),
  retention_hours integer not null default 24 check (retention_hours between 1 and 168),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.ai_visualization_rate_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('CREATE_JOB', 'SIGNED_UPLOAD', 'START_GENERATION', 'RESULT_READ')),
  guest_session_hash text not null check (guest_session_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null check (expires_at > created_at)
);
create index ai_rate_guest_idx on public.ai_visualization_rate_events(event_type, guest_session_hash, created_at desc);
create index ai_rate_ip_idx on public.ai_visualization_rate_events(event_type, ip_hash, created_at desc);
create index ai_rate_expiry_idx on public.ai_visualization_rate_events(expires_at);

create trigger ai_visualization_jobs_touch before update on public.ai_visualization_jobs
  for each row execute function private.touch_updated_at();
create trigger ai_visualizer_settings_touch before update on public.ai_visualizer_settings
  for each row execute function private.touch_updated_at();

alter table public.ai_visualization_jobs enable row level security;
alter table public.ai_visualization_attempts enable row level security;
alter table public.ai_visualizer_settings enable row level security;
alter table public.ai_visualization_rate_events enable row level security;

revoke all on public.ai_visualization_jobs, public.ai_visualization_attempts,
  public.ai_visualizer_settings, public.ai_visualization_rate_events from public, anon, authenticated;
grant select on public.ai_visualization_jobs, public.ai_visualization_attempts to authenticated;
grant select, update on public.ai_visualizer_settings to authenticated;
grant select, insert, update, delete on public.ai_visualization_jobs,
  public.ai_visualization_attempts, public.ai_visualizer_settings,
  public.ai_visualization_rate_events to service_role;
grant usage, select on sequence public.ai_visualization_attempts_id_seq,
  public.ai_visualization_rate_events_id_seq to service_role;

create policy ai_jobs_admin_read on public.ai_visualization_jobs for select to authenticated
  using (private.current_staff_role() in ('OWNER', 'ADMIN'));
create policy ai_attempts_admin_read on public.ai_visualization_attempts for select to authenticated
  using (private.current_staff_role() in ('OWNER', 'ADMIN'));
create policy ai_settings_staff_read on public.ai_visualizer_settings for select to authenticated
  using (private.current_staff_role() is not null);
create policy ai_settings_admin_update on public.ai_visualizer_settings for update to authenticated
  using (private.current_staff_role() in ('OWNER', 'ADMIN'))
  with check (private.current_staff_role() in ('OWNER', 'ADMIN'));

-- Guests receive scoped signed tokens from server routes. There is deliberately no
-- anon/authenticated policy for either AI bucket, so listing and direct object access fail closed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('ai-inputs', 'ai-inputs', false, 4194304, array['image/jpeg', 'image/png', 'image/webp']),
  ('ai-results', 'ai-results', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.consume_ai_visualization_rate_limit(
  p_event_type text,
  p_guest_session_hash text,
  p_ip_hash text,
  p_window_seconds integer,
  p_guest_limit integer,
  p_ip_limit integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_guest_count integer;
  v_ip_count integer;
begin
  if p_event_type not in ('CREATE_JOB', 'SIGNED_UPLOAD', 'START_GENERATION', 'RESULT_READ')
    or p_guest_session_hash !~ '^[0-9a-f]{64}$'
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_window_seconds not between 1 and 86400
    or p_guest_limit not between 1 and 1000
    or p_ip_limit not between 1 and 5000
  then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_ARGUMENT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(721042010);
  delete from public.ai_visualization_rate_events where expires_at <= pg_catalog.now();

  select count(*) into v_guest_count
  from public.ai_visualization_rate_events
  where event_type = p_event_type
    and guest_session_hash = p_guest_session_hash
    and created_at > pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds);

  select count(*) into v_ip_count
  from public.ai_visualization_rate_events
  where event_type = p_event_type
    and ip_hash = p_ip_hash
    and created_at > pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds);

  if v_guest_count >= p_guest_limit then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'GUEST_RATE_LIMIT');
  end if;
  if v_ip_count >= p_ip_limit then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'IP_RATE_LIMIT');
  end if;

  insert into public.ai_visualization_rate_events(
    event_type, guest_session_hash, ip_hash, expires_at
  ) values (
    p_event_type, p_guest_session_hash, p_ip_hash,
    pg_catalog.now() + pg_catalog.make_interval(secs => p_window_seconds)
  );
  return pg_catalog.jsonb_build_object('allowed', true, 'reason', null);
end $$;
revoke all on function public.consume_ai_visualization_rate_limit(text, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_ai_visualization_rate_limit(text, text, text, integer, integer, integer)
  to service_role;

create or replace function public.reserve_ai_visualization_attempt(
  p_job_id uuid,
  p_guest_session_hash text,
  p_idempotency_hash text,
  p_combined_request_hash text,
  p_model_name text,
  p_prompt_version text,
  p_output_size text,
  p_guest_daily_limit integer,
  p_global_daily_limit integer,
  p_max_concurrent_jobs integer,
  p_retention_hours integer,
  p_dedup_minutes integer default 30
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.ai_visualization_jobs%rowtype;
  v_existing_job_id uuid;
  v_existing_public_reference text;
  v_guest_count integer;
  v_global_count integer;
  v_active_count integer;
  v_attempt_number integer;
begin
  if p_guest_session_hash !~ '^[0-9a-f]{64}$'
    or p_idempotency_hash !~ '^[0-9a-f]{64}$'
    or p_combined_request_hash !~ '^[0-9a-f]{64}$'
    or char_length(p_model_name) not between 3 and 200
    or p_prompt_version !~ '^[a-z0-9][a-z0-9-]{2,79}$'
    or p_output_size <> '1K'
    or p_guest_daily_limit not between 1 and 20
    or p_global_daily_limit not between 1 and 1000
    or p_max_concurrent_jobs not between 1 and 20
    or p_retention_hours not between 1 and 168
    or p_dedup_minutes not between 1 and 1440
  then
    raise exception using errcode = '22023', message = 'INVALID_AI_RESERVATION_ARGUMENT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(721042011);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_guest_session_hash, 721042012));

  select a.job_id, j.public_reference
    into v_existing_job_id, v_existing_public_reference
  from public.ai_visualization_attempts a
  join public.ai_visualization_jobs j on j.id = a.job_id
  where a.guest_session_hash = p_guest_session_hash
    and a.idempotency_hash = p_idempotency_hash
  limit 1;
  if v_existing_job_id is not null then
    return pg_catalog.jsonb_build_object(
      'outcome', 'IDEMPOTENT',
      'jobId', v_existing_job_id,
      'publicReference', v_existing_public_reference
    );
  end if;

  select * into v_job
  from public.ai_visualization_jobs
  where id = p_job_id and guest_session_hash = p_guest_session_hash
  for update;
  if not found then
    return pg_catalog.jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if v_job.status not in ('READY', 'FAILED', 'REJECTED') or v_job.deleted_at is not null then
    return pg_catalog.jsonb_build_object('outcome', 'INVALID_STATUS', 'status', v_job.status);
  end if;

  select j.id, j.public_reference into v_existing_job_id, v_existing_public_reference
  from public.ai_visualization_jobs j
  where j.guest_session_hash = p_guest_session_hash
    and j.combined_request_hash = p_combined_request_hash
    and j.status = 'SUCCEEDED'
    and j.deleted_at is null
    and j.completed_at > pg_catalog.now() - pg_catalog.make_interval(mins => p_dedup_minutes)
  order by j.completed_at desc
  limit 1;
  if v_existing_job_id is not null and v_existing_job_id <> p_job_id then
    update public.ai_visualization_jobs
      set status = 'DELETED', deleted_at = pg_catalog.now(), expires_at = pg_catalog.now()
      where id = p_job_id;
    return pg_catalog.jsonb_build_object(
      'outcome', 'REUSED',
      'jobId', v_existing_job_id,
      'publicReference', v_existing_public_reference
    );
  end if;

  select count(*) into v_guest_count
  from public.ai_visualization_attempts
  where guest_session_hash = p_guest_session_hash
    and created_at >= pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'UTC') at time zone 'UTC';
  if v_guest_count >= p_guest_daily_limit then
    return pg_catalog.jsonb_build_object('outcome', 'GUEST_DAILY_LIMIT');
  end if;

  select count(*) into v_global_count
  from public.ai_visualization_attempts
  where created_at >= pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'UTC') at time zone 'UTC';
  if v_global_count >= p_global_daily_limit then
    return pg_catalog.jsonb_build_object('outcome', 'GLOBAL_DAILY_LIMIT');
  end if;

  select count(*) into v_active_count
  from public.ai_visualization_jobs
  where status = 'PROCESSING' and id <> p_job_id;
  if v_active_count >= p_max_concurrent_jobs then
    return pg_catalog.jsonb_build_object('outcome', 'CONCURRENCY_LIMIT');
  end if;

  if exists (
    select 1 from public.ai_visualization_jobs
    where guest_session_hash = p_guest_session_hash
      and id <> p_job_id
      and status in ('CREATED', 'UPLOAD_PENDING', 'READY', 'PROCESSING')
  ) then
    return pg_catalog.jsonb_build_object('outcome', 'JOB_ALREADY_RUNNING');
  end if;

  v_attempt_number := v_job.attempt_number + 1;
  insert into public.ai_visualization_attempts(
    job_id, guest_session_hash, attempt_number, idempotency_hash, model_name
  ) values (
    p_job_id, p_guest_session_hash, v_attempt_number, p_idempotency_hash, p_model_name
  );

  update public.ai_visualization_jobs set
    status = 'PROCESSING',
    combined_request_hash = p_combined_request_hash,
    model_name = p_model_name,
    prompt_version = p_prompt_version,
    output_size = p_output_size,
    attempt_number = v_attempt_number,
    started_at = coalesce(started_at, pg_catalog.now()),
    completed_at = null,
    error_code = null,
    safe_error_message = null,
    provider_request_id = null,
    provider_status = null,
    provider_error_code = null,
    last_provider_poll_at = null,
    expires_at = pg_catalog.now() + pg_catalog.make_interval(hours => p_retention_hours)
  where id = p_job_id;

  return pg_catalog.jsonb_build_object(
    'outcome', 'RESERVED',
    'jobId', p_job_id,
    'publicReference', v_job.public_reference,
    'attemptNumber', v_attempt_number
  );
end $$;
revoke all on function public.reserve_ai_visualization_attempt(uuid, text, text, text, text, text, text, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_visualization_attempt(uuid, text, text, text, text, text, text, integer, integer, integer, integer, integer)
  to service_role;

create or replace function public.claim_expired_ai_visualization_jobs(p_batch_size integer default 50)
returns table(id uuid, input_storage_path text, result_storage_path text, public_reference text)
language plpgsql security definer set search_path = '' as $$
begin
  if p_batch_size not between 1 and 200 then
    raise exception using errcode = '22023', message = 'INVALID_CLEANUP_BATCH_SIZE';
  end if;
  return query
  with candidates as (
    select j.id
    from public.ai_visualization_jobs j
    where j.expires_at <= pg_catalog.now()
      and j.status not in ('PROCESSING', 'EXPIRED', 'DELETED')
      and (j.cleanup_claimed_at is null or j.cleanup_claimed_at < pg_catalog.now() - interval '15 minutes')
    order by j.expires_at, j.id
    for update skip locked
    limit p_batch_size
  ), claimed as (
    update public.ai_visualization_jobs j
      set cleanup_claimed_at = pg_catalog.now()
    from candidates c
    where j.id = c.id
    returning j.id, j.input_storage_path, j.result_storage_path, j.public_reference
  )
  select c.id, c.input_storage_path, c.result_storage_path, c.public_reference from claimed c;
end $$;
revoke all on function public.claim_expired_ai_visualization_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_expired_ai_visualization_jobs(integer) to service_role;

insert into public.ai_visualizer_settings(id) values (true) on conflict (id) do nothing;
