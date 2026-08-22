-- Run this in the Supabase SQL Editor if the project already has schema.sql applied.
-- Creates workspaces, membership, join requests, and invites for the signup flow.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null check (plan in ('solo', 'team')),
  domain text,
  country text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists workspaces_domain_unique
  on public.workspaces (domain)
  where domain is not null;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  token uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists workspace_invites_email_idx
  on public.workspace_invites (lower(email));

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.workspace_invites enable row level security;

drop policy if exists "workspace_members_select_own" on public.workspace_members;
create policy "workspace_members_select_own" on public.workspace_members
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "workspaces_member_select" on public.workspaces;
create policy "workspaces_member_select" on public.workspaces
  for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id and m.user_id = auth.uid()
    )
  );

drop policy if exists "join_requests_select_own" on public.join_requests;
create policy "join_requests_select_own" on public.join_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "workspace_invites_select_own_email" on public.workspace_invites;
create policy "workspace_invites_select_own_email" on public.workspace_invites
  for select to authenticated
  using (
    lower(email) = lower(coalesce((select email from public.profiles p where p.id = auth.uid()), ''))
  );
