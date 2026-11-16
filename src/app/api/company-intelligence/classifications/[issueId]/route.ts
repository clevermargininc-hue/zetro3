import { NextResponse } from "next/server";
import { catalogueRequestUser, catalogueBody, catalogueResponseError } from "@/lib/company-catalogue-request";
import { getIssueCatalogueContext, correctIssueCatalogueClassification } from "@/lib/company-catalogue-service";
type Context={params:Promise<{issueId:string}>};
export async function GET(request:Request,context:Context){try{const access=await catalogueRequestUser(request);const {issueId}=await context.params;return NextResponse.json(await getIssueCatalogueContext(access.userId,issueId));}catch(error){return catalogueResponseError(error);}}
export async function POST(request:Request,context:Context){try{const access=await catalogueRequestUser(request);const {issueId}=await context.params;const body=await catalogueBody(request);return NextResponse.json(await correctIssueCatalogueClassification(access.userId,issueId,body));}catch(error){return catalogueResponseError(error);}}
