import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { CatalogueError, getCatalogueAccess } from "@/lib/company-catalogue-service";
export async function catalogueRequestUser(request: Request, write = false) {
  const {user}=await getRequestUser(request);
  if(!user)throw new CatalogueError("Sign in to access your company catalogue.",401);
  return getCatalogueAccess(user.id,write);
}
export async function catalogueBody(request: Request) {
  const body:unknown=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body))throw new CatalogueError("Send a valid JSON object.");
  return body as Record<string,unknown>;
}
export function catalogueResponseError(error:unknown) {
  return NextResponse.json({error:error instanceof Error?error.message:"Catalogue request failed."},{status:error instanceof CatalogueError?error.status:500});
}
