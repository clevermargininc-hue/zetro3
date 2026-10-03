-- Commercial plans per workspace (separate from solo/team, which is login access).
-- Run in the Supabase SQL Editor. Safe to run more than once.
-- Only the server (service role) reads or writes these tables; there are no user policies.

create table if not exists public.workspace_billing (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'monthly', 'annual', 'paused')),
  trial_calls int not null default 50 check (trial_calls >= 0),
  committed_calls int check (committed_calls is null or committed_calls >= 0),
  contract_start date,
  contract_end date,
  notes text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.workspace_billing enable row level security;

-- One row per successful score, so re-scores (billed at half price) can be counted.
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('first', 'rescore')),
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create index if not exists score_events_workspace_idx
  on public.score_events (workspace_id, created_at desc);

alter table public.score_events enable row level security;

-- Calls with a saved score, across everyone in the workspace. Used for the trial limit.
-- Uses score_events so that deleting calls from the workspace does NOT refund or reset the quota.
create or replace function public.workspace_scored_calls(target uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
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

-- Admin overview: all-time scored calls plus first scores and re-scores since a date.
create or replace function public.workspace_usage(since timestamptz)
returns table (workspace_id uuid, scored_calls bigint, first_scores bigint, rescores bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    greatest(
      coalesce((select count(*) from public.score_events e where e.workspace_id = w.id and e.kind = 'first'), 0),
      coalesce((
        select count(*)
        from public.call_scores s
        join public.calls c on c.id = s.call_id
        join public.workspace_members m on m.user_id = c.user_id and m.workspace_id = w.id
      ), 0)
    ),
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

-- Invoice estimate: scores since a date, grouped by kind and length band.
create or replace function public.workspace_band_usage(target uuid, since timestamptz)
returns table (kind text, band text, calls bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.kind,
    case
      when coalesce(e.duration_seconds, 0) <= 300 then 'short'
      when e.duration_seconds <= 600 then 'medium'
      else 'long'
    end,
    count(*)
  from public.score_events e
  where e.workspace_id = target and e.created_at >= since
  group by 1, 2;
$$;

revoke execute on function public.workspace_scored_calls(uuid) from public, anon, authenticated;
revoke execute on function public.workspace_usage(timestamptz) from public, anon, authenticated;
revoke execute on function public.workspace_band_usage(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.workspace_scored_calls(uuid) to service_role;
grant execute on function public.workspace_usage(timestamptz) to service_role;
grant execute on function public.workspace_band_usage(uuid, timestamptz) to service_role;

-- Workspaces that existed before plans keep working: trial topped up by what they already scored.
insert into public.workspace_billing (workspace_id, plan, trial_calls, notes)
select
  w.id,
  'trial',
  50 + public.workspace_scored_calls(w.id)::int,
  'Existed before plans. Trial topped up by calls already scored — set the real plan.'
from public.workspaces w
on conflict (workspace_id) do nothing;
