-- Fix: Prevent Call Quota Reset on Deletion
-- Run this script in the Supabase SQL Editor.
-- This ensures that when a user deletes scored calls from their workspace,
-- the trial quota / plan usage counter remains cumulative and does NOT reset or replenish.

-- 1. Ensure workspace_scored_calls counts score_events (which persist on call deletion)
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

-- 2. Update workspace_usage to also retain cumulative scored calls for admin reporting
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

revoke execute on function public.workspace_scored_calls(uuid) from public, anon, authenticated;
revoke execute on function public.workspace_usage(timestamptz) from public, anon, authenticated;
grant execute on function public.workspace_scored_calls(uuid) to service_role;
grant execute on function public.workspace_usage(timestamptz) to service_role;

notify pgrst, 'reload schema';
