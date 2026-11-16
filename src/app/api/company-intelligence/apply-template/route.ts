import { NextResponse } from "next/server";
import { catalogueRequestUser, catalogueBody, catalogueResponseError } from "@/lib/company-catalogue-request";
import { applyIndustryStarterTemplate, CatalogueError } from "@/lib/company-catalogue-service";
export const runtime="nodejs";
export async function POST(request:Request){try{const access=await catalogueRequestUser(request,true);const body=await catalogueBody(request);if(typeof body.templateId!=="string")throw new CatalogueError("Choose a template.");return NextResponse.json(await applyIndustryStarterTemplate(access.userId,access.workspaceId,body.templateId));}catch(error){return catalogueResponseError(error);}}
