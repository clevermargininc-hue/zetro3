import { createAdminClient } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/workspaces";
import { loadAllJourneyRows } from "@/lib/customer-intelligence-query";
import { CATALOGUE_ENTITIES, INDUSTRY_STARTER_TEMPLATES, catalogueInputError, type CatalogueEntityType, type CatalogueInput, type CompanyCatalogue, validateCatalogueClassification } from "@/lib/company-catalogue";
export * from "@/lib/company-catalogue";

export class CatalogueError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function getCatalogueAccess(userId: string, write = false) {
  const membership = await getMembership(userId);
  if (write && membership && membership.role !== "admin") throw new CatalogueError("Only workspace administrators can change the catalogue.",403);
  return {userId, workspaceId: membership?.workspaceId || null, canManage: !membership || membership.role === "admin"};
}
function scoped<T>(query: T, userId: string, workspaceId: string | null): T {
  const filter=query as unknown as {eq:(column:string,value:string)=>T;is:(column:string,value:null)=>T};
  if(workspaceId)return filter.eq("workspace_id",workspaceId);
  const personal=filter.is("workspace_id",null) as unknown as {eq:(column:string,value:string)=>T};
  return personal.eq("user_id",userId);
}
export async function getCompanyCatalogue(userId: string, workspaceId: string | null): Promise<CompanyCatalogue> {
  // A caller can never select a different workspace through the admin client.
  const access = await getCatalogueAccess(userId);
  if (workspaceId !== access.workspaceId) throw new CatalogueError("Catalogue workspace does not match your membership.",403);
  const db = createAdminClient();
  const results = await Promise.all(Object.values(CATALOGUE_ENTITIES).map(entity =>
    loadAllJourneyRows((from,to)=>scoped(db.from(entity.table).select("*"),userId,workspaceId).order("name").order("id").range(from,to))));
  const errors = results.flatMap(result => result.error ? [result.error] : []);
  if (errors.length) {
    const missing = errors.every(error => /does not exist|schema cache|could not find.*table/i.test(error.message));
    if (missing) return {serviceAreas:[],products:[],services:[],issueCategories:[],isConfigured:false,migrationRequired:true};
    throw new CatalogueError("Could not load company catalogue: " + errors[0].message,500);
  }
  const [areas,products,services,categories] = results.map(result=>result.data || []);
  const serviceAreas = areas.map(a=>({id:a.id,workspaceId:a.workspace_id,name:a.name,description:a.description,categoryType:a.category_type,parentId:a.parent_id,isActive:a.is_active,metadata:a.metadata || {},createdAt:a.created_at,updatedAt:a.updated_at}));
  const mappedProducts = products.map(p=>({id:p.id,workspaceId:p.workspace_id,name:p.name,description:p.description,productCategoryId:p.product_category_id,sku:p.sku,isActive:p.is_active,metadata:p.metadata || {},createdAt:p.created_at,updatedAt:p.updated_at}));
  const mappedServices = services.map(s=>({id:s.id,workspaceId:s.workspace_id,name:s.name,description:s.description,serviceCategoryId:s.service_category_id,isActive:s.is_active,metadata:s.metadata || {},createdAt:s.created_at,updatedAt:s.updated_at}));
  const issueCategories = categories.map(c=>({id:c.id,workspaceId:c.workspace_id,name:c.name,description:c.description,serviceId:c.service_id,parentId:c.parent_id,isActive:c.is_active,createdAt:c.created_at}));
  const {error:upgradeError}=await db.from("company_classification_events").select("id",{head:true}).limit(1);
  if(upgradeError && !/does not exist|schema cache|could not find.*table/i.test(upgradeError.message))throw new CatalogueError(upgradeError.message,500);
  const {error:reviewSchemaError}=await db.from("customer_issues").select("journey_requires_review",{head:true}).limit(1);
  if(reviewSchemaError && !/does not exist|schema cache|could not find.*column/i.test(reviewSchemaError.message))throw new CatalogueError(reviewSchemaError.message,500);
  return {upgradeRequired:Boolean(upgradeError || reviewSchemaError),serviceAreas,products:mappedProducts,services:mappedServices,issueCategories,isConfigured:[...serviceAreas,...mappedProducts,...mappedServices,...issueCategories].some(item=>item.isActive)};
}
export function formatCatalogueForPrompt(catalogue: CompanyCatalogue): string {
  if (!catalogue.isConfigured) return "No active company catalogue is configured. Leave product, service and area references null; do not assume an industry.";
  return Object.entries(CATALOGUE_ENTITIES).map(([type,entity]) => entity.label.toUpperCase()+"S:\n"+catalogue[entity.key].filter(item=>item.isActive).map(item=>JSON.stringify(item)).join("\n")).join("\n\n");
}
export async function saveCatalogueItem(userId: string, type: CatalogueEntityType, input: CatalogueInput, id?: string) {
  const error = catalogueInputError(input,!id); if(error) throw new CatalogueError(error);
  const {workspaceId} = await getCatalogueAccess(userId,true);
  const catalogue = await getCompanyCatalogue(userId,workspaceId);
  if(catalogue.migrationRequired) throw new CatalogueError("The company catalogue database setup is required before changes can be saved.",409);
  const entity = CATALOGUE_ENTITIES[type];
  const previous = id ? catalogue[entity.key].find(item=>item.id===id) : null;
  if(id && !previous) throw new CatalogueError("Catalogue entry not found in this workspace.",404);
  const name=input.name?.trim() || previous?.name;
  if(catalogue[entity.key].some(item=>item.id!==id && item.name.trim().toLowerCase()===name?.toLowerCase())) throw new CatalogueError("An entry with this name already exists. Edit or reactivate it instead.",409);
  const references: Array<[keyof CatalogueInput, keyof CompanyCatalogue]> = type === "product" ? [["productCategoryId","serviceAreas"]] : type === "service" ? [["serviceCategoryId","serviceAreas"]] : type === "service_area" ? [["parentId","serviceAreas"]] : [["serviceId","services"],["parentId","issueCategories"]];
  for(const [key,list] of references) {
    if(input[key] && (!(catalogue[list] as Array<{id:string;isActive:boolean}>).some(item=>item.id===input[key] && (item.isActive || (previous && (previous as unknown as Record<string,unknown>)[key]===input[key]))) || input[key]===id)) throw new CatalogueError("Related entries must be active and belong to this workspace.");
    if(key==="parentId" && input[key]) {
      let parentId: string | null = input[key] as string; const seen=new Set<string>(id?[id]:[]);
      while(parentId){if(seen.has(parentId))throw new CatalogueError("A catalogue hierarchy cannot contain a cycle.");seen.add(parentId);const parent=(catalogue[list] as Array<{id:string;parentId?:string|null}>).find(item=>item.id===parentId);parentId=parent?.parentId||null;}
    }
  }
  const row:Record<string,unknown>=catalogue.upgradeRequired?{}:{updated_by:userId};
  const fields:Record<string,string>={name:"name",description:"description",isActive:"is_active",...(type==="service_area"?{categoryType:"category_type",parentId:"parent_id",metadata:"metadata"}:type==="product"?{productCategoryId:"product_category_id",sku:"sku",metadata:"metadata"}:type==="service"?{serviceCategoryId:"service_category_id",metadata:"metadata"}:{serviceId:"service_id",parentId:"parent_id"})};
  for(const [key,column] of Object.entries(fields)) if(input[key as keyof CatalogueInput]!==undefined){const value=input[key as keyof CatalogueInput];row[column]=typeof value==="string" ? value.trim()||null : value;}
  if(type!=="issue_category")row.updated_at=new Date().toISOString();
  const db=createAdminClient();
  const query=id ? scoped(db.from(entity.table).update(row).eq("id",id),userId,workspaceId) : db.from(entity.table).insert({...row,user_id:userId,workspace_id:workspaceId,is_active:input.isActive??true});
  const {data,error:saveError}=await query.select("*").single();
  if(saveError)throw new CatalogueError(saveError.message,500);
  return data;
}
export async function applyIndustryStarterTemplate(userId: string, workspaceId: string|null, templateId: string) {
  const template=INDUSTRY_STARTER_TEMPLATES[templateId];
  if(!template)throw new CatalogueError("Choose a valid industry template. No template has been applied.");
  const access=await getCatalogueAccess(userId,true);if(access.workspaceId!==workspaceId)throw new CatalogueError("Workspace mismatch.",403);
  let catalogue=await getCompanyCatalogue(userId,workspaceId);let created=0;
  const ensure=async(type:CatalogueEntityType,data:CatalogueInput)=>{
    const list=catalogue[CATALOGUE_ENTITIES[type].key];const existing=list.find(item=>item.name.toLowerCase()===data.name?.toLowerCase());if(existing)return existing.id;
    const row=await saveCatalogueItem(userId,type,data);created++; catalogue=await getCompanyCatalogue(userId,workspaceId);return row.id as string;
  };
  const areas=new Map<string,string>();for(const a of template.serviceAreas)areas.set(a.name,await ensure("service_area",a));
  for(const p of template.products)await ensure("product",{name:p.name,description:p.description,productCategoryId:areas.get(p.serviceAreaName||"")||null});
  const services=new Map<string,string>();for(const s of template.services)services.set(s.name,await ensure("service",{name:s.name,description:s.description,serviceCategoryId:areas.get(s.serviceAreaName||"")||null}));
  for(const c of template.issueCategories)await ensure("issue_category",{name:c.name,description:c.description,serviceId:services.get(c.serviceName||"")||null});
  return {success:true,message:`${template.name}: added ${created} entries. Existing entries were preserved.`,created};
}

export async function importCompanyCatalogue(userId:string, input:Record<string,unknown>) {
  const access=await getCatalogueAccess(userId,true);
  const keys=["serviceAreas","products","services","issueCategories"] as const;
  if(!keys.some(key=>Array.isArray(input[key])))throw new CatalogueError("Import needs serviceAreas, products, services, or issueCategories arrays.");
  let total=0;
  for(const key of keys){if(input[key]!==undefined&&!Array.isArray(input[key]))throw new CatalogueError(`${key} must be an array.`);const rows=(input[key]||[]) as unknown[];total+=rows.length;for(const row of rows){const error=catalogueInputError(row,true);if(error)throw new CatalogueError(`${key}: ${error}`);}}
  if(total<1||total>250)throw new CatalogueError("Import between 1 and 250 entries at a time.");
  let catalogue=await getCompanyCatalogue(userId,access.workspaceId);let created=0,skipped=0;
  for(const [type,entity] of Object.entries(CATALOGUE_ENTITIES) as Array<[CatalogueEntityType,typeof CATALOGUE_ENTITIES[CatalogueEntityType]]>){
    // Relationships require areas first, then products/services, then issue categories.
    for(const raw of (input[entity.key]||[]) as Array<CatalogueInput & {serviceAreaName?:string;serviceName?:string}>){
      if(catalogue[entity.key].some(item=>item.name.toLowerCase()===raw.name?.trim().toLowerCase())){skipped++;continue;}
      const data:CatalogueInput={...raw};
      if(raw.serviceAreaName){const area=catalogue.serviceAreas.find(a=>a.name.toLowerCase()===raw.serviceAreaName?.toLowerCase());if(!area)throw new CatalogueError(`Import stopped after ${created} additions: service area '${raw.serviceAreaName}' was not found.`);if(type==="product")data.productCategoryId=area.id;if(type==="service")data.serviceCategoryId=area.id;}
      if(raw.serviceName&&type==="issue_category"){const service=catalogue.services.find(a=>a.name.toLowerCase()===raw.serviceName?.toLowerCase());if(!service)throw new CatalogueError(`Import stopped after ${created} additions: service '${raw.serviceName}' was not found.`);data.serviceId=service.id;}
      try{await saveCatalogueItem(userId,type,data);created++;catalogue=await getCompanyCatalogue(userId,access.workspaceId);}catch(error){throw new CatalogueError(`Import stopped after ${created} additions. ${error instanceof Error?error.message:"Save failed"}`);}
    }
  }
  return {success:true,created,skipped,message:`Imported ${created} entries; skipped ${skipped} existing names. Previous entries and history were preserved.`};
}

export async function persistIssueCatalogueClassification(params:{userId:string;workspaceId:string|null;issueId:string;callId?:string;classification:ReturnType<typeof validateCatalogueClassification>;raw:unknown;catalogue:CompanyCatalogue;method?:"ai_inferred"|"human_verified";notes?:string}) {
  const {classification:c}=params;const db=createAdminClient();
  if(!params.catalogue.upgradeRequired){
    const {error}=await db.rpc("save_company_issue_classification",{p_issue_id:params.issueId,p_actor_id:params.userId,p_call_id:params.callId||null,p_payload:c,p_raw:params.raw,p_method:params.method||"ai_inferred",p_notes:params.notes||""});
    if(error)throw new CatalogueError("Could not save catalogue classification: "+error.message,500);
    return;
  }
  if(params.method==="human_verified")throw new CatalogueError("Apply the company catalogue connection migration before correcting classifications.",409);
  // Base schema compatibility: validated IDs still populate reporting until audit/versioning is installed.
  const common={workspace_id:params.workspaceId,user_id:params.userId,issue_id:params.issueId,classification_confidence:c.confidence,classification_method:"ai_inferred",review_status:c.requiresReview?"suggested":"classified"};
  const rows=[...c.products.map(p=>({...common,product_id:p.id,service_area_id:p.productCategoryId})),...c.services.map(s=>({...common,service_id:s.id,service_area_id:s.serviceCategoryId})),...c.serviceAreas.map(a=>({...common,service_area_id:a.id}))];
  if(rows.length){const {error}=await db.from("issue_service_relationships").insert(rows);if(error)throw new CatalogueError("Could not connect issue to catalogue: "+error.message,500);}
}

export async function getIssueCatalogueContext(userId:string,issueId:string) {
  const access=await getCatalogueAccess(userId);const db=createAdminClient();
  const {data:issue,error}=await scoped(db.from("customer_issues").select("*").eq("id",issueId),userId,access.workspaceId).maybeSingle();
  if(error)throw new CatalogueError(error.message,500);if(!issue)throw new CatalogueError("Issue not found in this workspace.",404);
  const catalogue=await getCompanyCatalogue(userId,access.workspaceId);
  if(catalogue.migrationRequired)return {catalogue,issue,relationships:[],events:[]};
  const {data:relationships,error:relationshipError}=await db.from("issue_service_relationships").select("*").eq("issue_id",issueId);
  if(relationshipError)throw new CatalogueError(relationshipError.message,500);
  const events=catalogue.upgradeRequired?{data:[],error:null}:await db.from("company_classification_events").select("id,method,classification_version,validated_output,notes,created_at").eq("issue_id",issueId).order("created_at",{ascending:false}).limit(30);
  if(events.error)throw new CatalogueError(events.error.message,500);
  return {catalogue,issue,relationships:(relationships||[]).filter(row=>row.is_current!==false),events:events.data||[]};
}
export async function correctIssueCatalogueClassification(userId:string,issueId:string,body:Record<string,unknown>) {
  const context=await getIssueCatalogueContext(userId,issueId);const {catalogue,issue}=context;
  if(catalogue.migrationRequired||catalogue.upgradeRequired)throw new CatalogueError("Apply the catalogue database setup before correcting classifications.",409);
  const notes=typeof body.notes==="string"?body.notes.trim():"";if(!notes||notes.length>4000)throw new CatalogueError("Add a review note (up to 4,000 characters).");
  const references={products:catalogue.products,services:catalogue.services,service_areas:catalogue.serviceAreas};
  for(const [key,rows] of Object.entries(references)){
    if(body[key]!==undefined&&(!Array.isArray(body[key])||(body[key] as unknown[]).length>20))throw new CatalogueError("Select up to 20 references in each group.");
    for(const reference of (body[key]||[]) as Array<{id?:unknown}>){if(!reference||!rows.some(row=>row.id===reference.id&&row.isActive))throw new CatalogueError("Selected catalogue references must be active and belong to this workspace.");}
  }
  if(body.issue_category_id&&!catalogue.issueCategories.some(row=>row.id===body.issue_category_id&&row.isActive))throw new CatalogueError("Choose an active issue category in this workspace.");
  const classification=validateCatalogueClassification(catalogue,{...body,classification_confidence:1,requires_review:false});
  await persistIssueCatalogueClassification({userId,workspaceId:issue.workspace_id,issueId,classification,raw:body,catalogue,method:"human_verified",notes});
  return getIssueCatalogueContext(userId,issueId);
}
export async function getHistoricalCatalogueLinks(userId:string,workspaceId:string|null,issueIds:string[]) {
 const catalogue=await getCompanyCatalogue(userId,workspaceId);
 if(catalogue.migrationRequired||!issueIds.length)return [];
 const db=createAdminClient();const {data,error}=await loadAllJourneyRows((from,to)=>scoped(db.from("issue_service_relationships").select("*"),userId,workspaceId).in("issue_id",issueIds).order("id").range(from,to));
 if(error)throw new CatalogueError(error.message,500);
 return (data||[]).filter(link=>link.is_current!==false).map(link=>({issueId:link.issue_id,product:catalogue.products.find(p=>p.id===link.product_id)||null,service:catalogue.services.find(s=>s.id===link.service_id)||null,area:catalogue.serviceAreas.find(a=>a.id===link.service_area_id)||null}));
}
