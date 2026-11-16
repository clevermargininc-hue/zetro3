import { NextResponse } from "next/server";
import { getCompanyDataConnectionStats } from "@/lib/company-intelligence-bridge";
import { catalogueRequestUser, catalogueBody, catalogueResponseError } from "@/lib/company-catalogue-request";
import { getCompanyCatalogue, saveCatalogueItem, INDUSTRY_STARTER_TEMPLATES, isCatalogueEntity, type CatalogueInput } from "@/lib/company-catalogue-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await catalogueRequestUser(request);
    const [catalogue, connectionSummary] = await Promise.all([
      getCompanyCatalogue(access.userId, access.workspaceId),
      getCompanyDataConnectionStats(access.userId, undefined, access.workspaceId),
    ]);
    return NextResponse.json({
      catalogue,
      connectionSummary,
      canManage: access.canManage,
      availableTemplates: Object.values(INDUSTRY_STARTER_TEMPLATES),
    });
  } catch (error) {
    return catalogueResponseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await catalogueRequestUser(request, true);
    const body = await catalogueBody(request);
    if (!isCatalogueEntity(body.entityType)) {
      return NextResponse.json({ error: "Choose a valid entry type." }, { status: 400 });
    }
    const record = await saveCatalogueItem(access.userId, body.entityType, body.data as CatalogueInput);
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    return catalogueResponseError(error);
  }
}
