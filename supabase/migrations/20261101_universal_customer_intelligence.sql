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

