begin;
select plan(20);

select has_table('public','ai_visualization_jobs','AI jobs table exists');
select has_table('public','ai_visualization_attempts','AI attempts table exists');
select has_table('public','ai_visualizer_settings','AI settings table exists');
select has_table('public','ai_visualization_rate_events','AI rate events table exists');
select has_column('public','order_items','ai_visualization_job_id','order item has optional AI link');
select row_security_is_enabled('public','ai_visualization_jobs','AI jobs RLS enabled');
select row_security_is_enabled('public','ai_visualization_attempts','AI attempts RLS enabled');
select row_security_is_enabled('public','ai_visualizer_settings','AI settings RLS enabled');
select row_security_is_enabled('public','ai_visualization_rate_events','AI rate events RLS enabled');

select results_eq(
  $$select count(*)::bigint from storage.buckets where id in ('ai-inputs','ai-results') and not public$$,
  $$values (2::bigint)$$,
  'both AI buckets are private'
);
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname='storage' and tablename='objects' and roles && array['anon','authenticated']::name[] and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'ai-(inputs|results)'$$,
  $$values (0::bigint)$$,
  'no anon/authenticated policy grants AI object access or listing'
);
select ok(not has_table_privilege('anon','public.ai_visualization_jobs','SELECT'),'anon cannot select jobs');
select ok(not has_table_privilege('authenticated','public.ai_visualization_jobs','INSERT'),'authenticated user cannot create jobs directly');
select ok(not has_table_privilege('authenticated','public.ai_visualization_attempts','UPDATE'),'attempt history cannot be updated by staff client');

select has_function('public','consume_ai_visualization_rate_limit',array['text','text','text','integer','integer','integer'],'rate RPC exists');
select has_function('public','reserve_ai_visualization_attempt',array['uuid','text','text','text','text','text','text','integer','integer','integer','integer','integer'],'atomic reservation RPC exists');
select has_function('public','claim_ai_visualization_provider_poll',array['uuid','text','integer'],'provider poll claim RPC exists');
select has_function('public','claim_expired_ai_visualization_jobs',array['integer'],'cleanup claim RPC exists');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname='ai_jobs_one_active_guest_idx' and indexdef like '%PROCESSING%'$$,
  $$values (1::bigint)$$,
  'one active job per guest index exists'
);
select results_eq(
  $$select count(*)::bigint from information_schema.routine_privileges where routine_schema='public' and routine_name='reserve_ai_visualization_attempt' and grantee in ('anon','authenticated')$$,
  $$values (0::bigint)$$,
  'reservation RPC is service-only'
);

select * from finish();
rollback;
