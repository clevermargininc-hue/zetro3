-- ===========================================================================
-- Zetro — Customer Journey & Repeat Issue Intelligence Schema Migration
-- Safe & idempotent: can be run against an existing Zetro database at any time.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1.Unified Customer Profiles (public.customers)
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
create index if not exists customers_risk_idx on public.customers(user_id, risk_level);

-- ---------------------------------------------------------------------------
-- 2. Customer Identifiers (public.customer_identifiers)
-- Supports multiple identifiers per customer (Customer ID, MSISDN, CRM ID, etc.)
-- ---------------------------------------------------------------------------
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
create index if not exists customer_identifiers_workspace_lookup_idx on public.customer_identifiers(workspace_id, id_type, normalized_value);

-- ---------------------------------------------------------------------------
-- 3. Optional Call Metadata Extensions on public.calls
-- ---------------------------------------------------------------------------
alter table public.calls
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists caller_phone text,
  add column if not exists external_customer_ref text,
  add column if not exists location text,
  add column if not exists service_provider text,
  add column if not exists product_category text;

create index if not exists calls_customer_idx on public.calls(customer_id);
create index if not exists calls_caller_phone_idx on public.calls(caller_phone);

-- ---------------------------------------------------------------------------
-- 4. Independent Customer Issues & Lifecycle (public.customer_issues)
-- ---------------------------------------------------------------------------
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
      'new',
      'open',
      'in_progress',
      'pending_external_action',
      'escalated',
      'resolved',
      'reopened',
      'closed'
    )),
  resolution_confirmation text not null default 'unconfirmed'
    check (resolution_confirmation in (
      'unconfirmed',
      'agent_reported',
      'customer_confirmed',
      'operationally_verified'
    )),
  first_reported_at timestamptz not null default now(),
  latest_reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  reopened_count int not null default 0,
  repeat_interaction_count int not null default 0,
  total_calls int not null default 1,
  primary_root_cause text not null default 'unknown_insufficient_evidence'
    check (primary_root_cause in (
      'agent_related',
      'service_provider_technician',
      'network_technical',
      'operational_process',
      'product_service',
      'customer_related',
      'unknown_insufficient_evidence'
    )),
  primary_root_cause_detail text,
  secondary_root_cause text
    check (secondary_root_cause is null or secondary_root_cause in (
      'agent_related',
      'service_provider_technician',
      'network_technical',
      'operational_process',
      'product_service',
      'customer_related',
      'unknown_insufficient_evidence'
    )),
  secondary_root_cause_detail text,
  root_cause_evidence_type text not null default 'insufficient_evidence'
    check (root_cause_evidence_type in (
      'confirmed_evidence',
      'ai_inference',
      'possible_contributing_factor',
      'insufficient_evidence'
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
create index if not exists customer_issues_workspace_idx on public.customer_issues(workspace_id, latest_reported_at desc);
create index if not exists customer_issues_status_idx on public.customer_issues(user_id, status);
create index if not exists customer_issues_category_idx on public.customer_issues(user_id, category);
create index if not exists customer_issues_root_cause_idx on public.customer_issues(user_id, primary_root_cause);

-- ---------------------------------------------------------------------------
-- 5. Call-to-Issue Links & Repeat Call Classifications (public.issue_calls)
-- ---------------------------------------------------------------------------
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
    check (match_classification in (
      'new_issue',
      'same_issue',
      'related_issue',
      'reopened_issue',
      'needs_review'
    )),
  match_confidence numeric not null default 1.0,
  matched_previous_issue_id uuid references public.customer_issues(id) on delete set null,
  match_reason text not null default '',
  call_resolution_state text not null default 'unconfirmed'
    check (call_resolution_state in (
      'call_completed_issue_open',
      'pending_external_action',
      'escalated',
      'agent_reported_resolved',
      'customer_confirmed_resolved',
      'operationally_verified_resolved',
      'unconfirmed'
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

create index if not exists issue_calls_issue_idx on public.issue_calls(issue_id, interaction_number asc);
create index if not exists issue_calls_customer_idx on public.issue_calls(customer_id, created_at asc);
create index if not exists issue_calls_user_idx on public.issue_calls(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Root Cause & Responsibility Records (public.issue_root_causes)
-- ---------------------------------------------------------------------------
create table if not exists public.issue_root_causes (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.customer_issues(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null
    check (category in (
      'agent_related',
      'service_provider_technician',
      'network_technical',
      'operational_process',
      'product_service',
      'customer_related',
      'unknown_insufficient_evidence'
    )),
  subcategory text not null default 'general',
  secondary_category text,
  secondary_subcategory text,
  evidence_type text not null default 'ai_inference'
    check (evidence_type in (
      'confirmed_evidence',
      'ai_inference',
      'possible_contributing_factor',
      'insufficient_evidence'
    )),
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

create index if not exists issue_root_causes_issue_idx on public.issue_root_causes(issue_id, is_current);
create index if not exists issue_root_causes_user_idx on public.issue_root_causes(user_id, category);

-- ---------------------------------------------------------------------------
-- 7. Issue Lifecycle Status History (public.issue_status_history)
-- ---------------------------------------------------------------------------
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

create index if not exists issue_status_history_issue_idx on public.issue_status_history(issue_id, created_at asc);

-- ---------------------------------------------------------------------------
-- 8. Human Review & Correction Audit Log (public.issue_reviews)
-- Stored separately from original AI outputs for auditability
-- ---------------------------------------------------------------------------
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
      'confirm_match',
      'reject_match',
      'reassign_customer',
      'update_category',
      'confirm_root_cause',
      'reject_root_cause',
      'update_status',
      'confirm_resolution',
      'assign_team',
      'investigation_note'
    )),
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  notes text not null default '',
  responsible_team text,
  created_at timestamptz not null default now()
);

create index if not exists issue_reviews_issue_idx on public.issue_reviews(issue_id, created_at desc);
create index if not exists issue_reviews_customer_idx on public.issue_reviews(customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Row-Level Security (RLS) — Strict Organization / Tenant Isolation
-- ---------------------------------------------------------------------------
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

