-- Align recorded-audio usage buckets with the November 2026 Tanzania tariff.
begin;
create or replace function public.workspace_band_usage(target uuid, since timestamptz)
returns table(kind text, band text, calls bigint)
language sql security definer set search_path=public,pg_temp as $$
  select e.kind,
    case
      when coalesce(e.duration_seconds,0) <= 180 then 'upTo3'
      when e.duration_seconds <= 360 then 'upTo6'
      when e.duration_seconds <= 540 then 'upTo9'
      when e.duration_seconds <= 720 then 'upTo12'
      when e.duration_seconds <= 900 then 'upTo15'
      else 'over'
    end as band,
    count(*)::bigint as calls
  from public.score_events e
  where e.workspace_id=target and e.created_at>=since
  group by e.kind,2;
$$;
revoke execute on function public.workspace_band_usage(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.workspace_band_usage(uuid,timestamptz) to service_role;
commit;
