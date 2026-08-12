-- OWNER-DECISION-025; ADR-0015. Only the active pointer may change.
create or replace function private.prevent_amigo_price_version_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode='23514', message='AMIGO_PRICE_VERSION_IMMUTABLE';
  end if;
  if (to_jsonb(old) - 'is_active') <> (to_jsonb(new) - 'is_active') then
    raise exception using errcode='23514', message='AMIGO_PRICE_VERSION_IMMUTABLE';
  end if;
  return new;
end $$;
revoke all on function private.prevent_amigo_price_version_mutation() from public;
drop trigger if exists amigo_price_versions_immutable on public.amigo_price_versions;
create trigger amigo_price_versions_immutable before update or delete on public.amigo_price_versions
for each row execute function private.prevent_amigo_price_version_mutation();
