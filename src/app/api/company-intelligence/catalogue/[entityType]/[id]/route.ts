import { NextResponse } from "next/server";
import { catalogueRequestUser, catalogueBody, catalogueResponseError } from "@/lib/company-catalogue-request";
import { saveCatalogueItem, isCatalogueEntity, type CatalogueInput } from "@/lib/company-catalogue-service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{entityType:string;id:string}>};
export async function PATCH(request:Request,context:Context){
 try{const access=await catalogueRequestUser(request,true);const {entityType,id}=await context.params;const body=await catalogueBody(request);if(!isCatalogueEntity(entityType))return NextResponse.json({error:"Unknown entry type."},{status:400});const record=await saveCatalogueItem(access.userId,entityType,body as CatalogueInput,id);return NextResponse.json({success:true,record});}catch(error){return catalogueResponseError(error);}
}
export async function DELETE(request:Request,context:Context){
 try{const access=await catalogueRequestUser(request,true);const {entityType,id}=await context.params;if(!isCatalogueEntity(entityType))return NextResponse.json({error:"Unknown entry type."},{status:400});await saveCatalogueItem(access.userId,entityType,{isActive:false},id);return NextResponse.json({success:true,message:"Entry deactivated. Historical classifications are preserved."});}catch(error){return catalogueResponseError(error);}
}
