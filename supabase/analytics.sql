-- Admin analytics: live users, daily activity, and billing totals.
-- Run in the Supabase SQL Editor AFTER supabase/billing.sql. Safe to run more than once.
-- Only the server (service role) reads or writes these tables; there are no user policies.

-- Latest heartbeat per signed-in user. "Live" = seen in the last few minutes.
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  path text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx
  on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

-- One row per user per day they used the app (Tanzania time). Drives active-user charts.
create table if not exists public.user_active_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  primary key (user_id, day)
);

create index if not exists user_active_days_day_idx on public.user_active_days (day);

alter table public.user_active_days enable row level security;

create or replace function public.record_presence(p_user uuid, p_workspace uuid, p_path text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_presence (user_id, workspace_id, path, last_seen_at)
  values (p_user, p_workspace, left(p_path, 200), now())
  on conflict (user_id) do update
    set workspace_id = excluded.workspace_id,
        path = excluded.path,
        last_seen_at = now();

  insert into public.user_active_days (user_id, day, workspace_id)
  values (p_user, (now() at time zone 'Africa/Dar_es_Salaam')::date, p_workspace)
  on conflict (user_id, day) do nothing;
$$;

-- Older versions counted every account (including bot sign-ups and Zetro staff). Replace them.
drop function if exists public.admin_daily_activity(int);
drop function if exists public.admin_active_counts(int);

-- One row per day for the last `days` days (Tanzania time), with zeros on quiet days.
-- Only counts the users and workspaces passed in (real customers, chosen by the server).
create or replace function public.admin_daily_activity(days int, p_users uuid[], p_workspaces uuid[])
returns table (
  day date,
  active_users bigint,
  uploads bigint,
  first_scores bigint,
  rescores bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with span as (
    select generate_series(
      (now() at time zone 'Africa/Dar_es_Salaam')::date - (greatest(days, 1) - 1),
      (now() at time zone 'Africa/Dar_es_Salaam')::date,
      interval '1 day'
    )::date as day
  ),
  start_at as (
    select (min(day)::timestamp at time zone 'Africa/Dar_es_Salaam') as ts, min(day) as d from span
  ),
  act as (
    select a.day, count(*) as n
    from public.user_active_days a
    where a.day >= (select d from start_at)
      and a.user_id = any (p_users)
    group by a.day
  ),
  up as (
    select (c.created_at at time zone 'Africa/Dar_es_Salaam')::date as day, count(*) as n
    from public.calls c
    where c.created_at >= (select ts from start_at)
      and c.user_id = any (p_users)
    group by 1
  ),
  sc as (
    select
      (e.created_at at time zone 'Africa/Dar_es_Salaam')::date as day,
      count(*) filter (where e.kind = 'first') as f,
      count(*) filter (where e.kind = 'rescore') as r
    from public.score_events e
    where e.created_at >= (select ts from start_at)
      and e.workspace_id = any (p_workspaces)
    group by 1
  )
  select
    s.day,
    coalesce(act.n, 0),
    coalesce(up.n, 0),
    coalesce(sc.f, 0),
    coalesce(sc.r, 0)
  from span s
  left join act on act.day = s.day
  left join up on up.day = s.day
  left join sc on sc.day = s.day
  order by s.day;
$$;

create or replace function public.admin_active_counts(p_users uuid[])
returns table (active_today bigint, active_7d bigint, active_30d bigint)
language sql
stable
security definer
set search_path = public
as $$
  with today as (select (now() at time zone 'Africa/Dar_es_Salaam')::date as d)
  select
    (select count(*) from public.user_active_days
      where day = (select d from today) and user_id = any (p_users)),
    (select count(distinct user_id) from public.user_active_days
      where day > (select d from today) - 7 and user_id = any (p_users)),
    (select count(distinct user_id) from public.user_active_days
      where day > (select d from today) - 30 and user_id = any (p_users));
$$;

-- Scores since a date for every workspace, by kind and length band. Used for billing totals.
create or replace function public.all_band_usage(since timestamptz)
returns table (workspace_id uuid, kind text, band text, calls bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.workspace_id,
    e.kind,
    case
      when coalesce(e.duration_seconds, 0) <= 300 then 'short'
      when e.duration_seconds <= 600 then 'medium'
      else 'long'
    end,
    count(*)
  from public.score_events e
  where e.created_at >= since
  group by 1, 2, 3;
$$;

revoke execute on function public.record_presence(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_daily_activity(int, uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.admin_active_counts(uuid[]) from public, anon, authenticated;
revoke execute on function public.all_band_usage(timestamptz) from public, anon, authenticated;
grant execute on function public.record_presence(uuid, uuid, text) to service_role;
grant execute on function public.admin_daily_activity(int, uuid[], uuid[]) to service_role;
grant execute on function public.admin_active_counts(uuid[]) to service_role;
grant execute on function public.all_band_usage(timestamptz) to service_role;

notify pgrst, 'reload schema';
