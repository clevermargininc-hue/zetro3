import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { resolvedLanguageMode } from "@/lib/locale";
import type { LanguageMode } from "@/lib/types";
import { getMembership, getTeamScope } from "@/lib/workspaces";

export const runtime = "nodejs";
export const maxDuration = 800;

const MODES: LanguageMode[] = ["auto", "en", "sw", "mixed"];

export async function GET(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamScope = await getTeamScope(user.id);
  const { data, error } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .in("user_id", teamScope)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ calls: data });
}

export async function POST(request: Request) {
  const { user, supabase } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    audio_path?: string;
    file_name?: string;
    title?: string;
    agent_name?: string;
    language_mode?: LanguageMode;
  };

  if (!body.audio_path) {
    return NextResponse.json({ error: "audio_path is required" }, { status: 400 });
  }

  const requested = MODES.includes(body.language_mode || "auto")
    ? body.language_mode || "auto"
    : "auto";
  let languageMode = requested;
  try {
    const membership = await getMembership(user.id);
    languageMode = resolvedLanguageMode(membership?.country, requested);
  } catch {
    languageMode = requested;
  }

  const teamScope = await getTeamScope(user.id);
  let agentId: string | null = null;
  const agentName = body.agent_name?.trim();
  if (agentName) {
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .in("user_id", teamScope)
      .ilike("name", agentName)
      .maybeSingle();

    if (existing) {
      agentId = existing.id;
    } else {
      const { data: created, error: agentError } = await supabase
        .from("agents")
        .insert({ user_id: user.id, name: agentName })
        .select("id")
        .single();
      if (agentError) {
        return NextResponse.json({ error: agentError.message }, { status: 500 });
      }
      agentId = created.id;
    }
  }

  const { data: call, error } = await supabase
    .from("calls")
    .insert({
      user_id: user.id,
      agent_id: agentId,
      title: body.title?.trim() || body.file_name || "Untitled call",
      file_name: body.file_name || null,
      audio_path: body.audio_path,
      language_mode: languageMode,
      status: "queued",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ call, status: "queued" });
}
