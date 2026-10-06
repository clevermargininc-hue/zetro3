-- Fix: deleting scored calls must never restore the free trial or monthly quota.
-- Run this in the Supabase SQL Editor. Safe to run more than once.
--
-- Why this exists:
-- call_scores and live calls are deleted with the recording. If quota is counted only
-- from those rows, a user can score the trial, delete every call, and start again.
-- lifetime_first_scores and score_events stay after the call is gone.

-- Keep score_events when a call is deleted (do not cascade-delete quota rows).
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'score_events'
      and con.contype = 'f'
      and pg_get_constraintdef(con.oid) ilike '%calls%'
  loop
    execute format('alter table public.score_events drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.score_events
  add constraint score_events_call_id_fkey
  foreign key (call_id) references public.calls (id) on delete set null;

alter table public.workspace_billing
  add column if not exists lifetime_first_scores int not null default 0;

-- One first-score ledger row per call while the call still exists.
delete from public.score_events a
using public.score_events b
where a.kind = 'first'
  and b.kind = 'first'
  and a.call_id is not null
  and a.call_id = b.call_id
  and a.workspace_id = b.workspace_id
  and a.id > b.id;

create unique index if not exists score_events_first_call_uq
  on public.score_events (workspace_id, call_id)
  where kind = 'first' and call_id is not null;

create or replace function public.touch_first_score(
  p_workspace uuid,
  p_call uuid,
  p_user uuid,
  p_duration numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_workspace is null or p_call is null then
    return;
  end if;

  insert into public.workspace_billing (workspace_id, plan, trial_calls)
  values (p_workspace, 'trial', 50)
  on conflict (workspace_id) do nothing;

  with ins as (
    insert into public.score_events (workspace_id, call_id, user_id, kind, duration_seconds)
    values (p_workspace, p_call, p_user, 'first', p_duration)
    on conflict (workspace_id, call_id) where kind = 'first' and call_id is not null
    do nothing
    returning id
  )
  update public.workspace_billing b
  set lifetime_first_scores = lifetime_first_scores + 1
  where b.workspace_id = p_workspace
    and exists (select 1 from ins);
end;
$$;

create or replace function public.call_scores_after_insert_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  dur numeric;
  ws uuid;
begin
  select c.user_id, c.duration_seconds into uid, dur
  from public.calls c
  where c.id = new.call_id;

  if uid is null then
    return new;
  end if;

  select m.workspace_id into ws
  from public.workspace_members m
  where m.user_id = uid
  order by m.created_at asc
  limit 1;

  if ws is null then
    return new;
  end if;

  perform public.touch_first_score(ws, new.call_id, uid, dur);
  return new;
end;
$$;

drop trigger if exists call_scores_after_insert_quota on public.call_scores;
create trigger call_scores_after_insert_quota
  after insert on public.call_scores
  for each row execute procedure public.call_scores_after_insert_quota();

create or replace function public.workspace_scored_calls(target uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((select b.lifetime_first_scores from public.workspace_billing b where b.workspace_id = target), 0),
    coalesce((select count(*) from public.score_events e where e.workspace_id = target and e.kind = 'first'), 0),
    coalesce((
      select count(*)
      from public.call_scores s
      join public.calls c on c.id = s.call_id
      where c.user_id in (
        select m.user_id from public.workspace_members m where m.workspace_id = target
      )
    ), 0)
  );
$$;

create or replace function public.workspace_usage(since timestamptz)
returns table (workspace_id uuid, scored_calls bigint, first_scores bigint, rescores bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    public.workspace_scored_calls(w.id),
    (
      select count(*) from public.score_events e
      where e.workspace_id = w.id and e.kind = 'first' and e.created_at >= since
    ),
    (
      select count(*) from public.score_events e
      where e.workspace_id = w.id and e.kind = 'rescore' and e.created_at >= since
    )
  from public.workspaces w;
$$;

insert into public.workspace_billing (workspace_id, plan, trial_calls)
select w.id, 'trial', 50
from public.workspaces w
on conflict (workspace_id) do nothing;

insert into public.score_events (workspace_id, call_id, user_id, kind, duration_seconds)
select m.workspace_id, c.id, c.user_id, 'first', c.duration_seconds
from public.call_scores s
join public.calls c on c.id = s.call_id
join lateral (
  select wm.workspace_id
  from public.workspace_members wm
  where wm.user_id = c.user_id
  order by wm.created_at asc
  limit 1
) m on true
where not exists (
  select 1
  from public.score_events e
  where e.kind = 'first'
    and e.call_id = c.id
    and e.workspace_id = m.workspace_id
)
on conflict (workspace_id, call_id) where kind = 'first' and call_id is not null
do nothing;

update public.workspace_billing b
set lifetime_first_scores = greatest(
  coalesce(b.lifetime_first_scores, 0),
  coalesce((select count(*) from public.score_events e where e.workspace_id = b.workspace_id and e.kind = 'first'), 0)
);

revoke execute on function public.touch_first_score(uuid, uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.workspace_scored_calls(uuid) from public, anon, authenticated;
revoke execute on function public.workspace_usage(timestamptz) from public, anon, authenticated;
grant execute on function public.touch_first_score(uuid, uuid, uuid, numeric) to service_role;
grant execute on function public.workspace_scored_calls(uuid) to service_role;
grant execute on function public.workspace_usage(timestamptz) to service_role;

notify pgrst, 'reload schema';
