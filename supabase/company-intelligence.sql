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
alter table if exists public.interactions
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



-- Company catalogue connection, strict tenant policies, immutable classification events.
-- Prerequisites: customer-journey.sql and 20261102_company_catalogue_intelligence.sql.
begin;

alter table public.company_service_areas add column if not exists updated_by uuid references auth.users(id);
alter table public.company_products add column if not exists updated_by uuid references auth.users(id);
alter table public.company_services add column if not exists updated_by uuid references auth.users(id);
alter table public.issue_categories add column if not exists updated_by uuid references auth.users(id);
alter table public.issue_service_relationships add column if not exists is_current boolean not null default true;
alter table public.customer_issues
  add column if not exists catalogue_issue_category_id uuid references public.issue_categories(id) on delete set null,
  add column if not exists catalogue_issue_category_name text,
  add column if not exists catalogue_classification_status text not null default 'unknown',
  add column if not exists catalogue_classification_confidence numeric not null default 0,
  add column if not exists catalogue_requires_review boolean not null default true,
  add column if not exists catalogue_classification_version text,
  add column if not exists catalogue_suggestion jsonb;

create or replace function public.catalogue_tenant_read(ws uuid, owner_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and case when ws is null then owner_id=auth.uid()
 else exists(select 1 from public.workspace_members m where m.workspace_id=ws and m.user_id=auth.uid()) end;
$$;
create or replace function public.catalogue_tenant_write(ws uuid, owner_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and case when ws is null then owner_id=auth.uid()
 else exists(select 1 from public.workspace_members m where m.workspace_id=ws and m.user_id=auth.uid() and m.role='admin') end;
$$;
revoke all on function public.catalogue_tenant_read(uuid,uuid) from public;
revoke all on function public.catalogue_tenant_write(uuid,uuid) from public;
grant execute on function public.catalogue_tenant_read(uuid,uuid),public.catalogue_tenant_write(uuid,uuid) to authenticated,service_role;

do $$ declare t text; begin
 foreach t in array array['company_service_areas','company_products','company_services','issue_categories'] loop
   execute format('drop policy if exists %I on public.%I',t||'_team',t);
   execute format('drop policy if exists catalogue_read on public.%I',t);
   execute format('drop policy if exists catalogue_insert on public.%I',t);
   execute format('drop policy if exists catalogue_update on public.%I',t);
   execute format('create policy catalogue_read on public.%I for select to authenticated using(public.catalogue_tenant_read(workspace_id,user_id))',t);
   execute format('create policy catalogue_insert on public.%I for insert to authenticated with check(public.catalogue_tenant_write(workspace_id,user_id))',t);
   execute format('create policy catalogue_update on public.%I for update to authenticated using(public.catalogue_tenant_write(workspace_id,user_id)) with check(public.catalogue_tenant_write(workspace_id,user_id))',t);
 end loop;
end $$;
drop policy if exists issue_service_relationships_team on public.issue_service_relationships;
drop policy if exists catalogue_relationship_read on public.issue_service_relationships;
create policy catalogue_relationship_read on public.issue_service_relationships for select to authenticated
 using(public.catalogue_tenant_read(workspace_id,user_id));
-- No authenticated hard-delete or direct relationship-write policies. History is retained.

create table if not exists public.company_catalogue_audit (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 actor_id uuid not null references auth.users(id),
 entity_type text not null, entity_id uuid not null,
 action text not null check(action in ('create','update','deactivate','activate')),
 previous_value jsonb, new_value jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.company_catalogue_audit enable row level security;
drop policy if exists catalogue_audit_read on public.company_catalogue_audit;
create policy catalogue_audit_read on public.company_catalogue_audit for select to authenticated using(public.catalogue_tenant_read(workspace_id,user_id));
create index if not exists catalogue_audit_ws_time on public.company_catalogue_audit(workspace_id,created_at desc);

do $$ declare t text; begin
 foreach t in array array['company_service_areas','company_products','company_services','issue_categories'] loop
  execute format('create unique index if not exists %I on public.%I(workspace_id,lower(btrim(name))) where workspace_id is not null',t||'_workspace_name_unique',t);
  execute format('create unique index if not exists %I on public.%I(user_id,lower(btrim(name))) where workspace_id is null',t||'_personal_name_unique',t);
 end loop;
end $$;

create or replace function public.validate_catalogue_links()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare ref_id uuid; ref_table text; payload jsonb:=to_jsonb(new); ref_column text;
begin
 if tg_op='UPDATE' and (new.workspace_id is distinct from old.workspace_id or new.user_id is distinct from old.user_id) then
   raise exception 'Catalogue ownership cannot be moved between tenants';
 end if;
 if auth.uid() is not null then new.updated_by:=auth.uid(); end if;
 if new.workspace_id is not null and not exists(select 1 from public.workspace_members where workspace_id=new.workspace_id and user_id=new.user_id) then
   raise exception 'Catalogue owner must belong to the workspace';
 end if;
 for ref_column,ref_table in select * from (values
   ('product_category_id','company_service_areas'),('service_category_id','company_service_areas'),
   ('service_id','company_services'),('parent_id',case when tg_table_name='issue_categories' then 'issue_categories' else 'company_service_areas' end)
 ) refs(col,tbl) loop
   ref_id:=nullif(payload->>ref_column,'')::uuid;
   if ref_id is not null then
     execute format('select id from public.%I where id=$1 and workspace_id is not distinct from $2 and ($2 is not null or user_id=$3)',ref_table)
       into ref_id using ref_id,new.workspace_id,new.user_id;
     if ref_id is null then raise exception 'Related catalogue entry belongs to another tenant'; end if;
     if ref_column='parent_id' and ref_id=new.id then raise exception 'An entry cannot be its own parent'; end if;
   end if;
 end loop;
 return new;
end $$;
create or replace function public.log_catalogue_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.company_catalogue_audit(workspace_id,user_id,actor_id,entity_type,entity_id,action,previous_value,new_value)
 values(new.workspace_id,new.user_id,coalesce(new.updated_by,auth.uid(),new.user_id),tg_table_name,new.id,
 case when tg_op='INSERT' then 'create' when old.is_active and not new.is_active then 'deactivate' when not old.is_active and new.is_active then 'activate' else 'update' end,
 case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['company_service_areas','company_products','company_services','issue_categories'] loop
   execute format('drop trigger if exists validate_catalogue_links on public.%I',t);
   execute format('create trigger validate_catalogue_links before insert or update on public.%I for each row execute function public.validate_catalogue_links()',t);
   execute format('drop trigger if exists log_catalogue_change on public.%I',t);
   execute format('create trigger log_catalogue_change after insert or update on public.%I for each row execute function public.log_catalogue_change()',t);
 end loop;
end $$;

create table if not exists public.company_classification_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id), actor_id uuid not null references auth.users(id),
 issue_id uuid not null references public.customer_issues(id) on delete cascade,
 call_id uuid references public.calls(id) on delete set null,
 method text not null check(method in ('ai_inferred','human_verified')),
 classification_version text not null default 'zetro-catalogue-v2',
 original_output jsonb not null, validated_output jsonb not null, notes text not null default '',
 created_at timestamptz not null default now()
);
alter table public.company_classification_events enable row level security;
drop policy if exists classification_event_read on public.company_classification_events;
create policy classification_event_read on public.company_classification_events for select to authenticated using(public.catalogue_tenant_read(workspace_id,user_id));
create index if not exists classification_events_issue_time on public.company_classification_events(issue_id,created_at desc);

alter table public.customer_issues add column if not exists journey_requires_review boolean;

create or replace function public.save_company_issue_classification(
 p_issue_id uuid,p_actor_id uuid,p_call_id uuid,p_payload jsonb,p_raw jsonb,p_method text,p_notes text default ''
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare iss public.customer_issues; ref jsonb; target_id uuid; target_name text; target_area uuid;
 event_id uuid; first_product uuid; first_product_name text; first_service uuid; first_service_name text;
 first_area uuid; first_area_name text; cat_id uuid; cat_name text; confidence numeric; v_requires_review boolean;
begin
 select * into iss from public.customer_issues where id=p_issue_id for update;
 if not found then raise exception 'Issue not found'; end if;
 if iss.workspace_id is null then
   if iss.user_id<>p_actor_id then raise exception 'Issue is outside the actor tenant'; end if;
 elsif not exists(select 1 from public.workspace_members where workspace_id=iss.workspace_id and user_id=p_actor_id) then
   raise exception 'Issue is outside the actor workspace';
 end if;
 if p_method not in ('ai_inferred','human_verified') then raise exception 'Invalid classification method'; end if;
 if p_call_id is not null and not exists(select 1 from public.issue_calls where call_id=p_call_id and issue_id=p_issue_id) then raise exception 'Call is not linked to this issue'; end if;
 confidence:=coalesce((p_payload->>'confidence')::numeric,0);
 if confidence<0 or confidence>1 then raise exception 'Confidence must be between zero and one'; end if;
 v_requires_review:=coalesce((p_payload->>'requiresReview')::boolean,true);
 update public.issue_service_relationships set is_current=false where issue_id=p_issue_id and is_current;
 for ref in select value from jsonb_array_elements(coalesce(p_payload->'products','[]')) loop
   select id,name,product_category_id into target_id,target_name,target_area from public.company_products
    where id=(ref->>'id')::uuid and is_active and workspace_id is not distinct from iss.workspace_id and (iss.workspace_id is not null or user_id=iss.user_id);
   if target_id is null then raise exception 'Product is inactive or belongs to another tenant'; end if;
   if first_product is null then first_product:=target_id;first_product_name:=target_name;end if;
   insert into public.issue_service_relationships(workspace_id,user_id,issue_id,product_id,service_area_id,classification_confidence,classification_method,review_status)
    values(iss.workspace_id,iss.user_id,p_issue_id,target_id,target_area,confidence,p_method,case when p_method='human_verified' then 'verified' when v_requires_review then 'suggested' else 'classified' end);
 end loop;
 for ref in select value from jsonb_array_elements(coalesce(p_payload->'services','[]')) loop
   select id,name,service_category_id into target_id,target_name,target_area from public.company_services
    where id=(ref->>'id')::uuid and is_active and workspace_id is not distinct from iss.workspace_id and (iss.workspace_id is not null or user_id=iss.user_id);
   if target_id is null then raise exception 'Service is inactive or belongs to another tenant'; end if;
   if first_service is null then first_service:=target_id;first_service_name:=target_name;end if;
   insert into public.issue_service_relationships(workspace_id,user_id,issue_id,service_id,service_area_id,classification_confidence,classification_method,review_status)
    values(iss.workspace_id,iss.user_id,p_issue_id,target_id,target_area,confidence,p_method,case when p_method='human_verified' then 'verified' when v_requires_review then 'suggested' else 'classified' end);
 end loop;
 for ref in select value from jsonb_array_elements(coalesce(p_payload->'serviceAreas','[]')) loop
   select id,name into target_id,target_name from public.company_service_areas
    where id=(ref->>'id')::uuid and is_active and workspace_id is not distinct from iss.workspace_id and (iss.workspace_id is not null or user_id=iss.user_id);
   if target_id is null then raise exception 'Service area is inactive or belongs to another tenant'; end if;
   if first_area is null then first_area:=target_id;first_area_name:=target_name;end if;
   insert into public.issue_service_relationships(workspace_id,user_id,issue_id,service_area_id,classification_confidence,classification_method,review_status)
    values(iss.workspace_id,iss.user_id,p_issue_id,target_id,confidence,p_method,case when p_method='human_verified' then 'verified' when v_requires_review then 'suggested' else 'classified' end);
 end loop;
 if p_payload->'issueCategory'->>'id' is not null then
  select id,name into cat_id,cat_name from public.issue_categories where id=(p_payload->'issueCategory'->>'id')::uuid
   and is_active and workspace_id is not distinct from iss.workspace_id and (iss.workspace_id is not null or user_id=iss.user_id);
  if cat_id is null then raise exception 'Issue category is inactive or belongs to another tenant';end if;
 end if;
 insert into public.company_classification_events(workspace_id,user_id,actor_id,issue_id,call_id,method,original_output,validated_output,notes)
  values(iss.workspace_id,iss.user_id,p_actor_id,p_issue_id,p_call_id,p_method,p_raw,p_payload,p_notes) returning id into event_id;
 update public.customer_issues set product_id=first_product,product_name=first_product_name,service_id=first_service,service_name=first_service_name,
  service_area_id=first_area,service_area_name=first_area_name,catalogue_issue_category_id=cat_id,catalogue_issue_category_name=cat_name,
  catalogue_classification_status=case when first_product is not null or first_service is not null or first_area is not null or cat_id is not null then 'classified' when p_payload->>'status'='general_inquiry' then 'general_inquiry' else 'unknown' end,
  catalogue_classification_confidence=confidence,catalogue_requires_review=v_requires_review,catalogue_classification_version='zetro-catalogue-v2',
  catalogue_suggestion=p_payload->'suggestedEntry',journey_requires_review=coalesce(customer_issues.journey_requires_review,customer_issues.needs_review),
  needs_review=coalesce(customer_issues.journey_requires_review,customer_issues.needs_review) or v_requires_review,updated_at=now()
 where id=p_issue_id;
 return event_id;
end $$;
revoke all on function public.save_company_issue_classification(uuid,uuid,uuid,jsonb,jsonb,text,text) from public,authenticated;
grant execute on function public.save_company_issue_classification(uuid,uuid,uuid,jsonb,jsonb,text,text) to service_role;
commit;
