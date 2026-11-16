-- Secure, tenant-isolated integration access for real catalogue connections.
-- Prerequisites: 20261101, 20261102, 20261103.
begin;

drop policy if exists integrations_team on public.integrations;
drop policy if exists integration_credentials_team on public.integration_credentials;
drop policy if exists integration_field_mappings_team on public.integration_field_mappings;
drop policy if exists integration_sync_runs_team on public.integration_sync_runs;
drop policy if exists integration_events_team on public.integration_events;

create policy integration_read on public.integrations for select to authenticated
  using(public.catalogue_tenant_read(workspace_id,user_id));
create policy integration_insert on public.integrations for insert to authenticated
  with check(public.catalogue_tenant_write(workspace_id,user_id));
create policy integration_update on public.integrations for update to authenticated
  using(public.catalogue_tenant_write(workspace_id,user_id))
  with check(public.catalogue_tenant_write(workspace_id,user_id));

-- Secrets are service-role only; browser clients cannot select credential rows.
-- History is member-readable and server-written.
create policy integration_sync_runs_read on public.integration_sync_runs for select to authenticated
  using(public.catalogue_tenant_read(workspace_id,user_id));
create policy integration_events_read on public.integration_events for select to authenticated
  using(public.catalogue_tenant_read(workspace_id,user_id));
create policy integration_field_mappings_read on public.integration_field_mappings for select to authenticated
  using(public.catalogue_tenant_read(workspace_id,user_id));

commit;
