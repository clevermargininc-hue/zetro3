import { NextResponse } from "next/server";
import { catalogueRequestUser, catalogueBody, catalogueResponseError } from "@/lib/company-catalogue-request";
import { importCompanyCatalogue } from "@/lib/company-catalogue-service";
export const runtime="nodejs";
export async function POST(request:Request){try{const access=await catalogueRequestUser(request,true);const body=await catalogueBody(request);return NextResponse.json(await importCompanyCatalogue(access.userId,body));}catch(error){return catalogueResponseError(error);}}
