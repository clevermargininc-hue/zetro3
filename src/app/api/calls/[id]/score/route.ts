import { NextResponse, after } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { scoreCall } from "@/lib/process-call";
import { loadQaDocuments, summarizeDocuments } from "@/lib/qa-documents";
import { readinessErrorMessage } from "@/lib/qa-kinds";
import { getTeamScope } from "@/lib/workspaces";
import type { AuditMode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 800;

function parseMode(value: unknown): AuditMode | null {
  if (value === "documents") return value;
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: unknown;
    force?: unknown;
  };
  const mode = parseMode(body.mode);
  const force = body.force === true;
  if (!mode) {
    return NextResponse.json(
      { error: "Only documents-based scoring is supported. Upload Standards files first." },
      { status: 400 },
    );
  }

  const { data: call } = await supabase
    .from("calls")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  const teamScope = await getTeamScope(user.id);
  if (!call || !teamScope.includes(call.user_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!force && call.status === "completed") {
    return NextResponse.json({ ok: true, status: "completed", mode, reused: true });
  }

  if (mode === "documents") {
    try {
      const readiness = summarizeDocuments(await loadQaDocuments(user.id));
      if (!readiness.ready) {
        return NextResponse.json(
          {
            error: readinessErrorMessage(readiness.missing),
            missing: readiness.missing,
            code: "STANDARDS_REQUIRED",
          },
          { status: 409 },
        );
      }
    } catch (error) {
      const setupRequired = Boolean(
        error && typeof error === "object" && "setupRequired" in error,
      );
      return NextResponse.json(
        {
          error: readinessErrorMessage(
            ["document", "scorecard", "compliance"],
            setupRequired,
          ),
          code: "STANDARDS_REQUIRED",
        },
        { status: 409 },
      );
    }
  }

  const work = scoreCall(id, mode, { force }).catch((error) => {
    console.error("Scoring failed", error);
  });
  after(async () => {
    await work;
  });

  return NextResponse.json({ ok: true, status: "started", mode });
}
