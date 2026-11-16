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
  kind text not null check (kind in ('document', 'scorecard', 'compliance', 'opening', 'closing', 'holding')),
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
-- Create a helper function to check if a user is in the same workspace
create or replace function public.is_team_member(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid()
    and m2.user_id = target_user_id
  );
$$;

-- Helper function to check team membership safely from text (for Storage buckets)
create or replace function public.is_team_member_text(target_user_id_text text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_uuid uuid;
begin
  target_uuid := target_user_id_text::uuid;
  return exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid()
    and m2.user_id = target_uuid
  );
exception when invalid_text_representation then
  return false;
end;
$$;

drop policy if exists "agents_own" on public.agents;
drop policy if exists "agents_team" on public.agents;
create policy "agents_team" on public.agents
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "calls_own" on public.calls;
drop policy if exists "calls_team" on public.calls;
create policy "calls_team" on public.calls
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

-- Transcripts are visible to the call owner or team members in the app.
drop policy if exists "utterances_via_call" on public.utterances;
drop policy if exists "utterances_via_call_team" on public.utterances;
create policy "utterances_via_call_team" on public.utterances
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = utterances.call_id and (c.user_id = auth.uid() or public.is_team_member(c.user_id))
    )
  );

drop policy if exists "scores_via_call" on public.call_scores;
drop policy if exists "scores_via_call_team" on public.call_scores;
create policy "scores_via_call_team" on public.call_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = call_scores.call_id and (c.user_id = auth.uid() or public.is_team_member(c.user_id))
    )
  );

drop policy if exists "qa_documents_own" on public.qa_documents;
drop policy if exists "qa_documents_team" on public.qa_documents;
create policy "qa_documents_team" on public.qa_documents
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "qa_chunks_own" on public.qa_document_chunks;
drop policy if exists "qa_chunks_team" on public.qa_document_chunks;
create policy "qa_chunks_team" on public.qa_document_chunks
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));
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
drop policy if exists "call_audio_select_team" on storage.objects;
create policy "call_audio_select_team" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'call-audio'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_team_member_text(split_part(name, '/', 1)))
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
drop policy if exists "qa_documents_select_team" on storage.objects;
create policy "qa_documents_select_team" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qa-documents'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_team_member_text(split_part(name, '/', 1)))
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


-- ---------------------------------------------------------------------------
-- Customer Journey & Repeat Issue Intelligence (see supabase/customer-journey.sql)
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary_identifier text not null,
  display_label text not null,
  normalized_phone text,
  external_customer_id text,
  crm_id text,
  country_code text,
  total_calls int not null default 0,
  repeat_call_count int not null default 0,
  recurring_issue_count int not null default 0,
  new_issue_count int not null default 0,
  unresolved_issue_count int not null default 0,
  resolved_issue_count int not null default 0,
  reopened_issue_count int not null default 0,
  avg_hours_between_calls numeric,
  top_issue_categories text[] not null default '{}',
  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  needs_identity_review boolean not null default false,
  first_interaction_at timestamptz,
  last_interaction_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_user_idx on public.customers(user_id);
create index if not exists customers_workspace_idx on public.customers(workspace_id);
create index if not exists customers_normalized_phone_idx on public.customers(user_id, normalized_phone);
create index if not exists customers_external_id_idx on public.customers(user_id, external_customer_id);
create index if not exists customers_last_interaction_idx on public.customers(user_id, last_interaction_at desc);

create table if not exists public.customer_identifiers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  id_type text not null
    check (id_type in ('customer_id', 'msisdn', 'crm_id', 'account_number', 'extracted_phone', 'extracted_id')),
  raw_value text not null,
  normalized_value text not null,
  country_code text,
  source text not null default 'metadata'
    check (source in ('metadata', 'filename', 'transcript', 'manual')),
  confidence numeric not null default 1.0,
  is_primary boolean not null default false,
  verified_by_human boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_identifiers_customer_idx on public.customer_identifiers(customer_id);
create index if not exists customer_identifiers_lookup_idx on public.customer_identifiers(user_id, id_type, normalized_value);

alter table public.calls
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists caller_phone text,
  add column if not exists external_customer_ref text,
  add column if not exists location text,
  add column if not exists service_provider text,
  add column if not exists product_category text;

create table if not exists public.customer_issues (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_code text not null,
  title text not null,
  category text not null,
  subcategory text,
  product_service text,
  symptoms text[] not null default '{}',
  location text,
  service_provider text,
  status text not null default 'open'
    check (status in (
      'new', 'open', 'in_progress', 'pending_external_action', 'escalated', 'resolved', 'reopened', 'closed'
    )),
  resolution_confirmation text not null default 'unconfirmed'
    check (resolution_confirmation in (
      'unconfirmed', 'agent_reported', 'customer_confirmed', 'operationally_verified'
    )),
  first_reported_at timestamptz not null default now(),
  latest_reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  reopened_count int not null default 0,
  repeat_interaction_count int not null default 0,
  total_calls int not null default 1,
  primary_root_cause text not null default 'unknown_insufficient_evidence'
    check (primary_root_cause in (
      'agent_related', 'service_provider_technician', 'network_technical', 'operational_process', 'product_service', 'customer_related', 'unknown_insufficient_evidence'
    )),
  primary_root_cause_detail text,
  secondary_root_cause text
    check (secondary_root_cause is null or secondary_root_cause in (
      'agent_related', 'service_provider_technician', 'network_technical', 'operational_process', 'product_service', 'customer_related', 'unknown_insufficient_evidence'
    )),
  secondary_root_cause_detail text,
  root_cause_evidence_type text not null default 'insufficient_evidence'
    check (root_cause_evidence_type in (
      'confirmed_evidence', 'ai_inference', 'possible_contributing_factor', 'insufficient_evidence'
    )),
  root_cause_confidence numeric not null default 0.5,
  root_cause_explanation text,
  responsible_team text,
  recommended_action text,
  summary text not null default '',
  summary_embedding jsonb,
  needs_review boolean not null default false,
  human_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_issues_customer_idx on public.customer_issues(customer_id, latest_reported_at desc);
create index if not exists customer_issues_user_idx on public.customer_issues(user_id, latest_reported_at desc);

create table if not exists public.issue_calls (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  call_id uuid not null unique references public.calls(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  interaction_number int not null default 1,
  customer_contact_sequence int not null default 1,
  is_repeat_customer boolean not null default false,
  is_repeat_issue boolean not null default false,
  match_classification text not null default 'new_issue'
    check (match_classification in ('new_issue', 'same_issue', 'related_issue', 'reopened_issue', 'needs_review')),
  match_confidence numeric not null default 1.0,
  matched_previous_issue_id uuid references public.customer_issues(id) on delete set null,
  match_reason text not null default '',
  call_resolution_state text not null default 'unconfirmed'
    check (call_resolution_state in (
      'call_completed_issue_open', 'pending_external_action', 'escalated', 'agent_reported_resolved', 'customer_confirmed_resolved', 'operationally_verified_resolved', 'unconfirmed'
    )),
  extracted_category text,
  extracted_product_service text,
  extracted_symptoms text[] not null default '{}',
  extracted_issue_summary text not null default '',
  transcript_evidence jsonb not null default '[]'::jsonb,
  model_version text not null default 'zetro-journey-v1',
  human_review_status text
    check (human_review_status is null or human_review_status in ('confirmed', 'rejected', 'corrected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_root_causes (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null
    check (category in (
      'agent_related', 'service_provider_technician', 'network_technical', 'operational_process', 'product_service', 'customer_related', 'unknown_insufficient_evidence'
    )),
  subcategory text not null default 'general',
  secondary_category text,
  secondary_subcategory text,
  evidence_type text not null default 'ai_inference'
    check (evidence_type in ('confirmed_evidence', 'ai_inference', 'possible_contributing_factor', 'insufficient_evidence')),
  confidence numeric not null default 0.5,
  explanation text not null default '',
  recommended_action text not null default '',
  responsible_category text not null default '',
  transcript_excerpts jsonb not null default '[]'::jsonb,
  model_version text not null default 'zetro-journey-v1',
  is_current boolean not null default true,
  human_status text
    check (human_status is null or human_status in ('confirmed', 'rejected', 'overridden')),
  created_at timestamptz not null default now()
);

create table if not exists public.issue_status_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_status text,
  new_status text not null,
  resolution_confirmation text not null default 'unconfirmed',
  changed_by_type text not null default 'ai'
    check (changed_by_type in ('ai', 'human', 'system')),
  changed_by_user_id uuid references auth.users(id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.issue_reviews (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.customer_issues(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text,
  review_type text not null
    check (review_type in (
      'confirm_match', 'reject_match', 'reassign_customer', 'update_category', 'confirm_root_cause', 'reject_root_cause', 'update_status', 'confirm_resolution', 'assign_team', 'investigation_note'
    )),
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  notes text not null default '',
  responsible_team text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.customer_identifiers enable row level security;
alter table public.customer_issues enable row level security;
alter table public.issue_calls enable row level security;
alter table public.issue_root_causes enable row level security;
alter table public.issue_status_history enable row level security;
alter table public.issue_reviews enable row level security;

drop policy if exists "customers_team" on public.customers;
create policy "customers_team" on public.customers
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "customer_identifiers_team" on public.customer_identifiers;
create policy "customer_identifiers_team" on public.customer_identifiers
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "customer_issues_team" on public.customer_issues;
create policy "customer_issues_team" on public.customer_issues
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_calls_team" on public.issue_calls;
create policy "issue_calls_team" on public.issue_calls
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_root_causes_team" on public.issue_root_causes;
create policy "issue_root_causes_team" on public.issue_root_causes
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_status_history_team" on public.issue_status_history;
create policy "issue_status_history_team" on public.issue_status_history
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_reviews_team" on public.issue_reviews;
create policy "issue_reviews_team" on public.issue_reviews
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));


-- ===========================================================================
-- Zetro — Universal Customer Intelligence & Operational Intelligence Migration
-- Architecture: Hybrid Multi-Industry SaaS (Universal Engine + Industry Configs)
-- Safe & idempotent: can be executed repeatedly without data loss.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Extend Workspaces with Enterprise Organization Configuration
-- ---------------------------------------------------------------------------
alter table public.workspaces
  add column if not exists industry_id text not null default 'telecom',
  add column if not exists timezone text not null default 'Africa/Dar_es_Salaam',
  add column if not exists default_language text not null default 'sw',
  add column if not exists configuration jsonb not null default '{}'::jsonb,
  add column if not exists retention_days int not null default 365;

-- ---------------------------------------------------------------------------
-- 2. Industry Profiles (Layer B: Multi-Industry Definition Templates)
-- ---------------------------------------------------------------------------
create table if not exists public.industry_profiles (
  id text primary key,
  name text not null,
  description text not null,
  default_kpis text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed universal industry profiles
insert into public.industry_profiles (id, name, description, default_kpis)
values
  ('telecom', 'Telecommunications', 'Mobile network operators, ISPs, SIM services, data bundles, billing & field technicians', array['fcr', 'repeat_call_rate', 'network_outage_delay', 'agent_coaching_compliance']),
  ('banking', 'Banking & Financial Services', 'Retail banking, digital wallets, cards, payment disputes, ATM/POS & fraud queries', array['fcr', 'financial_dispute_sla', 'reopened_issue_rate', 'regulatory_compliance']),
  ('insurance', 'Insurance', 'Policy underwriting, claims handling, assessment delays, premium payments & partner garage SLAs', array['claim_cycle_time', 'repeat_contact_rate', 'provider_sla_compliance']),
  ('healthcare', 'Healthcare & Clinical Services', 'Patient appointments, lab results, insurance approvals, prescription fulfillment & admissions', array['patient_satisfaction', 'inquiry_resolution_time', 'booking_accuracy']),
  ('logistics', 'Logistics & Delivery', 'Parcel tracking, delayed dispatch, customs clearance, courier performance & lost shipment disputes', array['delivery_delay_rate', 'courier_resolution_rate', 'sla_breach_rate']),
  ('retail_ecommerce', 'Retail & E-commerce', 'Order processing, checkout errors, returns, refunds, defective items & logistics coordination', array['return_turnaround_time', 'refund_sla', 'customer_effort_score']),
  ('utilities', 'Utilities (Power, Water & Gas)', 'Metering disputes, power outages, connection requests, leakage reports & field dispatch', array['outage_resolution_time', 'billing_adjustment_rate', 'field_dispatch_sla']),
  ('hospitality', 'Hospitality & Travel', 'Hotel reservations, flight rescheduling, cancellations, baggage handling & guest disputes', array['first_contact_resolution', 'escalation_rate', 'guest_retention_risk'])
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  default_kpis = excluded.default_kpis;

-- ---------------------------------------------------------------------------
-- 3. Industry Canonical Issue Categories
-- ---------------------------------------------------------------------------
create table if not exists public.industry_issue_categories (
  id text primary key,
  industry_id text not null references public.industry_profiles(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  severity_default text not null default 'medium' check (severity_default in ('low', 'medium', 'high', 'critical')),
  subcategories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists industry_issue_categories_ind_idx on public.industry_issue_categories(industry_id);

-- ---------------------------------------------------------------------------
-- 4. Organization Industry Configurations (Custom rules per enterprise tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_industry_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  industry_id text not null references public.industry_profiles(id) on delete restrict,
  custom_categories jsonb not null default '[]'::jsonb,
  escalation_rules jsonb not null default '[]'::jsonb,
  sla_rules jsonb not null default '{}'::jsonb,
  ai_prompt_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, industry_id)
);

create index if not exists org_ind_configs_user_idx on public.organization_industry_configs(user_id);
create index if not exists org_ind_configs_ws_idx on public.organization_industry_configs(workspace_id);

-- ---------------------------------------------------------------------------
-- 5. Extend Customers with Universal Attributes & Types
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists customer_type text not null default 'individual'
    check (customer_type in ('individual', 'business', 'unknown')),
  add column if not exists profile_attributes jsonb not null default '{}'::jsonb,
  add column if not exists first_seen_at timestamptz default now(),
  add column if not exists last_seen_at timestamptz default now();

-- Extend Customer Identifiers with keyed normalized hashes and encryption reference
alter table public.customer_identifiers
  add column if not exists normalized_identifier_hash text,
  add column if not exists identifier_value_encrypted text,
  add column if not exists source_system_id text not null default 'zetro',
  add column if not exists source_record_id text,
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified_system', 'verified_human', 'rejected'));

create index if not exists customer_identifiers_hash_idx on public.customer_identifiers(normalized_identifier_hash);

-- ---------------------------------------------------------------------------
-- 6. Universal Interactions (Multi-channel: Calls, Tickets, Chats, Emails, etc.)
-- Links to existing calls without copying audio/transcripts unnecessarily.
-- ---------------------------------------------------------------------------
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  call_id uuid references public.calls(id) on delete set null,
  interaction_type text not null default 'call'
    check (interaction_type in (
      'call',
      'email',
      'chat',
      'whatsapp',
      'support_ticket',
      'branch_visit',
      'service_request',
      'complaint',
      'other'
    )),
  channel text not null default 'voice',
  direction text not null default 'inbound'
    check (direction in ('inbound', 'outbound', 'internal')),
  source_system_id text not null default 'zetro_voice',
  source_record_id text,
  external_reference text,
  agent_id uuid references public.agents(id) on delete set null,
  agent_name text,
  team_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  language text default 'sw',
  summary text,
  raw_payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'completed'
    check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interactions_user_idx on public.interactions(user_id, started_at desc);
create index if not exists interactions_ws_idx on public.interactions(workspace_id, started_at desc);
create index if not exists interactions_customer_idx on public.interactions(customer_id, started_at desc);
create index if not exists interactions_call_idx on public.interactions(call_id);
create index if not exists interactions_ext_ref_idx on public.interactions(source_system_id, external_reference);

-- ---------------------------------------------------------------------------
-- 7. Operational Entities (Agents, Technicians, Third Parties, NOC, Products)
-- ---------------------------------------------------------------------------
create table if not exists public.operational_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null
    check (entity_type in (
      'agent',
      'employee',
      'team',
      'department',
      'contractor',
      'supplier',
      'service_provider',
      'technician',
      'product',
      'service',
      'asset',
      'technical_system',
      'location'
    )),
  external_reference text,
  display_name text not null,
  department text,
  provider_id text,
  contact_info jsonb not null default '{}'::jsonb,
  active_status boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_entities_user_idx on public.operational_entities(user_id, entity_type);
create index if not exists operational_entities_ws_idx on public.operational_entities(workspace_id);
create index if not exists operational_entities_ext_idx on public.operational_entities(workspace_id, entity_type, external_reference);

-- ---------------------------------------------------------------------------
-- 8. Universal Evidence Records (Distinguishing facts, statements, & AI inferences)
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null
    check (evidence_type in (
      'transcript_excerpt',
      'call_recording',
      'ticket_event',
      'work_order',
      'delivery_confirmation',
      'transaction_status',
      'network_incident',
      'customer_confirmation',
      'system_event',
      'audit_log'
    )),
  provenance_type text not null default 'AI_INFERENCE'
    check (provenance_type in (
      'SYSTEM_FACT',
      'CUSTOMER_STATEMENT',
      'EMPLOYEE_STATEMENT',
      'AI_INFERENCE',
      'HUMAN_DECISION'
    )),
  source_system_id text not null default 'zetro',
  source_record_id text,
  interaction_id uuid references public.interactions(id) on delete cascade,
  call_id uuid references public.calls(id) on delete cascade,
  issue_id uuid references public.customer_issues(id) on delete cascade,
  operational_entity_id uuid references public.operational_entities(id) on delete set null,
  evidence_timestamp timestamptz not null default now(),
  excerpt_or_reference text not null,
  confidence numeric not null default 1.0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evidence_records_issue_idx on public.evidence_records(issue_id, evidence_timestamp asc);
create index if not exists evidence_records_interaction_idx on public.evidence_records(interaction_id);
create index if not exists evidence_records_call_idx on public.evidence_records(call_id);
create index if not exists evidence_records_user_idx on public.evidence_records(user_id);

-- ---------------------------------------------------------------------------
-- 9. Universal Issue-to-Interaction Junction (Many-to-Many)
-- ---------------------------------------------------------------------------
create table if not exists public.issue_interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  relationship_type text not null default 'same_issue'
    check (relationship_type in (
      'initial_report',
      'same_issue',
      'related_issue',
      'follow_up',
      'reopened_issue',
      'resolution_confirmation'
    )),
  matching_confidence numeric not null default 1.0,
  matching_method text not null default 'ai_semantic'
    check (matching_method in (
      'ai_semantic',
      'exact_ticket_id',
      'rule_heuristic',
      'human_verified'
    )),
  evidence_reference text,
  reviewed_status text
    check (reviewed_status is null or reviewed_status in ('pending', 'confirmed', 'rejected', 'corrected')),
  created_at timestamptz not null default now(),
  unique (issue_id, interaction_id)
);

create index if not exists issue_interactions_issue_idx on public.issue_interactions(issue_id);
create index if not exists issue_interactions_interaction_idx on public.issue_interactions(interaction_id);
create index if not exists issue_interactions_user_idx on public.issue_interactions(user_id);

-- ---------------------------------------------------------------------------
-- 10. Issue Events (Complete Immutable Lifecycle & Status Audit Trail)
-- ---------------------------------------------------------------------------
create table if not exists public.issue_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'status_change',
      'resolution_update',
      'escalation',
      'reassignment',
      'root_cause_identified',
      'external_action',
      'reopened',
      'review_override'
    )),
  previous_status text,
  new_status text not null,
  event_source text not null default 'ai'
    check (event_source in ('ai', 'system', 'human', 'connector')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  description text not null,
  event_time timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists issue_events_issue_idx on public.issue_events(issue_id, event_time asc);
create index if not exists issue_events_user_idx on public.issue_events(user_id);

-- ---------------------------------------------------------------------------
-- 11. Enhanced Root Cause Findings (Universal Root Cause Taxonomy)
-- ---------------------------------------------------------------------------
create table if not exists public.root_cause_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  interaction_id uuid references public.interactions(id) on delete set null,
  root_cause_category text not null
    check (root_cause_category in (
      'agent_related',
      'service_provider_technician',
      'network_technical',
      'operational_process',
      'product_service',
      'customer_related',
      'unknown_insufficient_evidence'
    )),
  root_cause_subcategory text not null default 'general',
  contributing_entity_id uuid references public.operational_entities(id) on delete set null,
  finding_type text not null default 'unverified_ai_inference'
    check (finding_type in (
      'confirmed_by_source_system',
      'evidence_supported_finding',
      'potential_contributing_factor',
      'unverified_ai_inference',
      'insufficient_evidence'
    )),
  explanation text not null,
  confidence_score numeric not null default 0.5,
  evidence_completeness text not null default 'moderate'
    check (evidence_completeness in ('high', 'moderate', 'low', 'insufficient')),
  analysis_version text not null default 'zetro-universal-v1',
  review_status text not null default 'pending'
    check (review_status in ('pending', 'confirmed', 'rejected', 'overridden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists root_cause_findings_issue_idx on public.root_cause_findings(issue_id);
create index if not exists root_cause_findings_user_idx on public.root_cause_findings(user_id, root_cause_category);

-- ---------------------------------------------------------------------------
-- 12. Operational Recommendations & Next Actions
-- ---------------------------------------------------------------------------
create table if not exists public.operational_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id uuid references public.customer_issues(id) on delete set null,
  finding_id uuid references public.root_cause_findings(id) on delete set null,
  recommendation_type text not null
    check (recommendation_type in (
      'agent_coaching',
      'field_dispatch',
      'process_revision',
      'network_investigation',
      'customer_callback',
      'billing_adjustment',
      'vendor_sla_review'
    )),
  recommended_action text not null,
  responsible_team_id text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'in_progress', 'completed', 'dismissed')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_recommendations_user_idx on public.operational_recommendations(user_id, status);
create index if not exists operational_recommendations_ws_idx on public.operational_recommendations(workspace_id);

-- ---------------------------------------------------------------------------
-- 13. Integration Hub Management Tables (Generic & Prebuilt Connectors)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  integration_type text not null default 'generic_rest'
    check (integration_type in ('generic_rest', 'webhook', 'crm', 'ticketing', 'billing', 'telecom_cdr', 'custom')),
  provider text not null default 'generic',
  connection_status text not null default 'configured'
    check (connection_status in ('configured', 'active', 'failing', 'paused', 'disabled')),
  configuration jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integrations_ws_idx on public.integrations(workspace_id);
create index if not exists integrations_user_idx on public.integrations(user_id);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  credential_type text not null default 'api_key'
    check (credential_type in ('api_key', 'bearer_token', 'oauth2', 'basic_auth', 'webhook_secret')),
  encrypted_secret_reference text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create index if not exists integration_credentials_int_idx on public.integration_credentials(integration_id);

create table if not exists public.integration_field_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_entity_type text not null default 'ticket',
  external_field text not null,
  canonical_field text not null,
  transformation_rule text not null default 'direct_copy'
    check (transformation_rule in ('direct_copy', 'phone_normalize', 'date_iso', 'lowercase', 'enum_map', 'json_path')),
  is_required boolean not null default false,
  validation_rule text,
  created_at timestamptz not null default now()
);

create index if not exists integration_field_mappings_int_idx on public.integration_field_mappings(integration_id);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'partial')),
  records_received int not null default 0,
  records_processed int not null default 0,
  records_failed int not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists integration_sync_runs_int_idx on public.integration_sync_runs(integration_id, started_at desc);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_event_id text not null,
  event_type text not null,
  payload_reference jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'ignored', 'failed')),
  processed_at timestamptz,
  unique (integration_id, external_event_id)
);

create index if not exists integration_events_lookup_idx on public.integration_events(integration_id, external_event_id);
create index if not exists integration_events_status_idx on public.integration_events(integration_id, processing_status);

-- ---------------------------------------------------------------------------
-- 14. Strict Multi-Tenant Row-Level Security (RLS)
-- ---------------------------------------------------------------------------
alter table public.industry_profiles enable row level security;
alter table public.industry_issue_categories enable row level security;
alter table public.organization_industry_configs enable row level security;
alter table public.interactions enable row level security;
alter table public.operational_entities enable row level security;
alter table public.evidence_records enable row level security;
alter table public.issue_interactions enable row level security;
alter table public.issue_events enable row level security;
alter table public.root_cause_findings enable row level security;
alter table public.operational_recommendations enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_field_mappings enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_events enable row level security;

-- Industry profiles & default categories are globally readable by authenticated users
drop policy if exists "industry_profiles_read" on public.industry_profiles;
create policy "industry_profiles_read" on public.industry_profiles
  for select to authenticated using (true);

drop policy if exists "industry_categories_read" on public.industry_issue_categories;
create policy "industry_categories_read" on public.industry_issue_categories
  for select to authenticated using (true);

-- Tenant-isolated policies
drop policy if exists "org_industry_configs_team" on public.organization_industry_configs;
create policy "org_industry_configs_team" on public.organization_industry_configs
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "interactions_team" on public.interactions;
create policy "interactions_team" on public.interactions
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "operational_entities_team" on public.operational_entities;
create policy "operational_entities_team" on public.operational_entities
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "evidence_records_team" on public.evidence_records;
create policy "evidence_records_team" on public.evidence_records
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_interactions_team" on public.issue_interactions;
create policy "issue_interactions_team" on public.issue_interactions
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_events_team" on public.issue_events;
create policy "issue_events_team" on public.issue_events
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "root_cause_findings_team" on public.root_cause_findings;
create policy "root_cause_findings_team" on public.root_cause_findings
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "operational_recommendations_team" on public.operational_recommendations;
create policy "operational_recommendations_team" on public.operational_recommendations
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "integrations_team" on public.integrations;
create policy "integrations_team" on public.integrations
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "integration_credentials_team" on public.integration_credentials;
create policy "integration_credentials_team" on public.integration_credentials
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "integration_field_mappings_team" on public.integration_field_mappings;
create policy "integration_field_mappings_team" on public.integration_field_mappings
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "integration_sync_runs_team" on public.integration_sync_runs;
create policy "integration_sync_runs_team" on public.integration_sync_runs
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "integration_events_team" on public.integration_events;
create policy "integration_events_team" on public.integration_events
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));


-- ===========================================================================
-- Zetro — Universal Company Service & Product Intelligence Migration
-- Enables multi-industry, dynamic, organization-defined catalogues:
--   - company_service_areas
--   - company_products
--   - company_services
--   - issue_categories
--   - issue_service_relationships
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Company Service Areas (Broad operational domains e.g., Logistics Operations, Clinical Services)
-- ---------------------------------------------------------------------------
create table if not exists public.company_service_areas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category_type text not null default 'general',
  parent_id uuid references public.company_service_areas(id) on delete set null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_service_areas_ws_idx on public.company_service_areas(workspace_id, is_active);
create index if not exists company_service_areas_user_idx on public.company_service_areas(user_id);

-- ---------------------------------------------------------------------------
-- 2. Company Products (Specific tangible/digital products e.g., 4G Router, Savings Account, Insulin)
-- ---------------------------------------------------------------------------
create table if not exists public.company_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  product_category_id uuid references public.company_service_areas(id) on delete set null,
  sku text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_products_ws_idx on public.company_products(workspace_id, is_active);
create index if not exists company_products_user_idx on public.company_products(user_id);

-- ---------------------------------------------------------------------------
-- 3. Company Services (Specific service offerings e.g., Parcel Delivery, Card Replacement, Blood Test)
-- ---------------------------------------------------------------------------
create table if not exists public.company_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  service_category_id uuid references public.company_service_areas(id) on delete set null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_services_ws_idx on public.company_services(workspace_id, is_active);
create index if not exists company_services_user_idx on public.company_services(user_id);

-- ---------------------------------------------------------------------------
-- 4. Organization Issue Categories (Custom issue taxonomy linked to company services)
-- ---------------------------------------------------------------------------
create table if not exists public.issue_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  service_id uuid references public.company_services(id) on delete set null,
  parent_id uuid references public.issue_categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists issue_categories_ws_idx on public.issue_categories(workspace_id, is_active);
create index if not exists issue_categories_user_idx on public.issue_categories(user_id);

-- ---------------------------------------------------------------------------
-- 5. Issue Service Relationships (Junction linking issues to products, services, and areas)
-- ---------------------------------------------------------------------------
create table if not exists public.issue_service_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  service_id uuid references public.company_services(id) on delete set null,
  product_id uuid references public.company_products(id) on delete set null,
  service_area_id uuid references public.company_service_areas(id) on delete set null,
  classification_confidence numeric not null default 1.0,
  classification_method text not null default 'ai_inferred'
    check (classification_method in ('ai_inferred', 'rule_matched', 'human_verified')),
  review_status text not null default 'classified'
    check (review_status in ('classified', 'suggested', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists issue_service_rel_issue_idx on public.issue_service_relationships(issue_id);
create index if not exists issue_service_rel_service_idx on public.issue_service_relationships(service_id);
create index if not exists issue_service_rel_product_idx on public.issue_service_relationships(product_id);
create index if not exists issue_service_rel_area_idx on public.issue_service_relationships(service_area_id);
create index if not exists issue_service_rel_ws_idx on public.issue_service_relationships(workspace_id);

-- ---------------------------------------------------------------------------
-- 6. Extend Customer Issues with Direct Catalogue Columns
-- ---------------------------------------------------------------------------
alter table public.customer_issues
  add column if not exists service_id uuid references public.company_services(id) on delete set null,
  add column if not exists product_id uuid references public.company_products(id) on delete set null,
  add column if not exists service_area_id uuid references public.company_service_areas(id) on delete set null,
  add column if not exists service_name text,
  add column if not exists product_name text,
  add column if not exists service_area_name text;

create index if not exists customer_issues_area_idx on public.customer_issues(workspace_id, service_area_id);
create index if not exists customer_issues_service_idx on public.customer_issues(workspace_id, service_id);
create index if not exists customer_issues_product_idx on public.customer_issues(workspace_id, product_id);

-- ---------------------------------------------------------------------------
-- 7. Extend Universal Interactions with Direct Catalogue Columns
-- ---------------------------------------------------------------------------
alter table public.interactions
  add column if not exists service_id uuid references public.company_services(id) on delete set null,
  add column if not exists product_id uuid references public.company_products(id) on delete set null,
  add column if not exists service_area_id uuid references public.company_service_areas(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 8. Enable Multi-Tenant Row Level Security (RLS)
-- ---------------------------------------------------------------------------
alter table public.company_service_areas enable row level security;
alter table public.company_products enable row level security;
alter table public.company_services enable row level security;
alter table public.issue_categories enable row level security;
alter table public.issue_service_relationships enable row level security;

drop policy if exists "company_service_areas_team" on public.company_service_areas;
create policy "company_service_areas_team" on public.company_service_areas
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "company_products_team" on public.company_products;
create policy "company_products_team" on public.company_products
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "company_services_team" on public.company_services;
create policy "company_services_team" on public.company_services
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_categories_team" on public.issue_categories;
create policy "issue_categories_team" on public.issue_categories
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "issue_service_relationships_team" on public.issue_service_relationships;
create policy "issue_service_relationships_team" on public.issue_service_relationships
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));
