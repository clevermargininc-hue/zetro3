-- Zetro Call QA — run this in the Supabase SQL Editor after creating a project.
-- Dashboard → SQL Editor → New query → paste → Run

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  username text,
  country text,
  auto_audit boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id uuid references public.agents (id) on delete set null,
  title text,
  file_name text,
  audio_path text not null,
  duration_seconds numeric,
  language_mode text not null default 'auto',
  detected_language text,
  detected_languages jsonb,
  status text not null default 'queued',
  error_message text,
  assembly_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.utterances (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls (id) on delete cascade,
  sequence int not null,
  speaker_label text not null,
  role text not null default 'unknown',
  text text not null,
  start_ms int,
  end_ms int,
  confidence numeric
);

create table if not exists public.call_scores (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls (id) on delete cascade,
  overall_score int not null,
  greeting int,
  empathy int,
  professionalism int,
  resolution int,
  communication int,
  language_handling int,
  verdict text not null,
  customer_sentiment text,
  summary text,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  compliance_findings jsonb not null default '[]'::jsonb,
  standards_used jsonb not null default '[]'::jsonb,
  metric_evidence jsonb not null default '{}'::jsonb,
  audit_mode text not null default 'documents',
  created_at timestamptz not null default now()
);

create table if not exists public.qa_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('document', 'scorecard', 'compliance', 'opening', 'closing')),
  title text not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists calls_user_id_idx on public.calls (user_id, created_at desc);
create index if not exists calls_agent_id_idx on public.calls (agent_id);
create index if not exists utterances_call_id_idx on public.utterances (call_id, sequence);
create index if not exists qa_documents_user_id_idx on public.qa_documents (user_id, kind, created_at desc);

create table if not exists public.qa_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.qa_documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  chunk_index int not null,
  content text not null,
  embedding jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists qa_document_chunks_document_idx
  on public.qa_document_chunks (document_id);
create index if not exists qa_document_chunks_user_idx
  on public.qa_document_chunks (user_id, kind);

-- ---------------------------------------------------------------------------
-- Workspaces (team vs solo signup)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'given_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.calls enable row level security;
alter table public.utterances enable row level security;
alter table public.call_scores enable row level security;
alter table public.qa_documents enable row level security;
alter table public.qa_document_chunks enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.workspace_invites enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists "agents_own" on public.agents;
create policy "agents_own" on public.agents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "calls_own" on public.calls;
create policy "calls_own" on public.calls
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "utterances_via_call" on public.utterances;
create policy "utterances_via_call" on public.utterances
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = utterances.call_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "scores_via_call" on public.call_scores;
create policy "scores_via_call" on public.call_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = call_scores.call_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "qa_documents_own" on public.qa_documents;
create policy "qa_documents_own" on public.qa_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "qa_chunks_own" on public.qa_document_chunks;
create policy "qa_chunks_own" on public.qa_document_chunks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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

-- ---------------------------------------------------------------------------
-- Storage bucket for call recordings (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('call-audio', 'call-audio', false)
on conflict (id) do nothing;

drop policy if exists "call_audio_insert_own" on storage.objects;
create policy "call_audio_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'call-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "call_audio_select_own" on storage.objects;
create policy "call_audio_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'call-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "call_audio_delete_own" on storage.objects;
create policy "call_audio_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'call-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

insert into storage.buckets (id, name, public)
values ('qa-documents', 'qa-documents', false)
on conflict (id) do nothing;

drop policy if exists "qa_documents_insert_own" on storage.objects;
create policy "qa_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "qa_documents_select_own" on storage.objects;
create policy "qa_documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "qa_documents_delete_own" on storage.objects;
create policy "qa_documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime — the call detail page watches these for live progress
-- ---------------------------------------------------------------------------

alter table public.calls replica identity full;
alter table public.utterances replica identity full;
alter table public.call_scores replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.calls;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.utterances;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.call_scores;
  exception when duplicate_object then null;
  end;
end $$;
