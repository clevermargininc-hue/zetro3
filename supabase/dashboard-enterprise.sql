-- ===========================================================================
-- Zetro — Enterprise QA Dashboard Migration (Idempotent)
-- Adds Teams, Queues, CoachingTasks, Notifications, multi-channel call triage,
-- user preferences (theme/locale/timezone), and granular RBAC operational roles.
-- Safe to run repeatedly with zero data loss.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Teams & Queues
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  department text,
  lead_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_ws_idx on public.teams(workspace_id);
create index if not exists teams_user_idx on public.teams(user_id);

create table if not exists public.queues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  channel text not null default 'voice'
    check (channel in ('voice', 'whatsapp', 'email', 'chat', 'other')),
  sla_seconds int not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists queues_ws_idx on public.queues(workspace_id);
create index if not exists queues_team_idx on public.queues(team_id);

-- ---------------------------------------------------------------------------
-- 2. Extend Calls with Channel, Queue, Team & QA Review Workflow Status
-- ---------------------------------------------------------------------------
alter table public.calls
  add column if not exists channel text not null default 'voice'
    check (channel in ('voice', 'whatsapp', 'email', 'chat', 'other')),
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists queue_id uuid references public.queues(id) on delete set null,
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'needs_coaching', 'escalated')),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists calls_team_idx on public.calls(team_id);
create index if not exists calls_queue_idx on public.calls(queue_id);
create index if not exists calls_review_status_idx on public.calls(review_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Extend Profiles & Workspace Members with Preferences & Operational Role
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists theme_preference text not null default 'light'
    check (theme_preference in ('light', 'dark')),
  add column if not exists locale_preference text not null default 'en'
    check (locale_preference in ('en', 'sw')),
  add column if not exists timezone_preference text not null default 'Africa/Dar_es_Salaam',
  add column if not exists operational_role text;

alter table public.workspace_members
  add column if not exists operational_role text not null default 'member'
    check (operational_role in ('admin', 'qa_manager', 'team_lead', 'compliance_officer', 'executive', 'member'));

-- ---------------------------------------------------------------------------
-- 4. Coaching Tasks
-- ---------------------------------------------------------------------------
create table if not exists public.coaching_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  title text not null,
  notes text not null default '',
  criterion text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'dismissed')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coaching_tasks_ws_idx on public.coaching_tasks(workspace_id, status);
create index if not exists coaching_tasks_call_idx on public.coaching_tasks(call_id);
create index if not exists coaching_tasks_agent_idx on public.coaching_tasks(agent_id);

-- ---------------------------------------------------------------------------
-- 5. Workspace Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  category text not null default 'review'
    check (category in ('compliance', 'review', 'coaching', 'system')),
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text not null default '',
  link_href text,
  call_id uuid references public.calls(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_ws_idx on public.notifications(workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.queues enable row level security;
alter table public.coaching_tasks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "teams_team" on public.teams;
create policy "teams_team" on public.teams
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "queues_team" on public.queues;
create policy "queues_team" on public.queues
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "coaching_tasks_team" on public.coaching_tasks;
create policy "coaching_tasks_team" on public.coaching_tasks
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "notifications_team" on public.notifications;
create policy "notifications_team" on public.notifications
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

-- ---------------------------------------------------------------------------
-- 7. Realtime Publication for Live Overview Signals
-- ---------------------------------------------------------------------------
alter table public.coaching_tasks replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.coaching_tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;

