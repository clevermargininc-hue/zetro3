import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { loadQaReport } from "@/lib/load-qa-report";
import { parseReportQuery } from "@/lib/reports";
import { excelBuffer, exportFilename, pdfBuffer } from "@/lib/report-files";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const { period, date, agentId } = parseReportQuery(url);
  if (!period) {
    return NextResponse.json(
      { error: "Period must be daily, weekly, monthly, or annually." },
      { status: 400 },
    );
  }
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "Format must be xlsx or pdf." }, { status: 400 });
  }

  try {
    const report = await loadQaReport(supabase, user.id, period, date, agentId);
    const body = format === "xlsx" ? await excelBuffer(report) : pdfBuffer(report);
    const filename = exportFilename(report, format);
    const type =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export report";
    const status = message === "Agent not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
