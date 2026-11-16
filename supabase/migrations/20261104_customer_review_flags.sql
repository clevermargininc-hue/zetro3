-- Preserve independent journey and catalogue review requirements.
begin;
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
