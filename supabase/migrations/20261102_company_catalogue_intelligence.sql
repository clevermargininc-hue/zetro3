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

