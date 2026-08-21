import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CallsBoard } from "@/components/calls-board";
import type { Call, CallScore } from "@/lib/types";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: calls } = await supabase
    .from("calls")
    .select("*, agents(name), call_scores(overall_score, verdict)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Inventory</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Call Audits</h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            All uploaded recordings. Status: Processing, Transcribed, or Scored / Audited.
          </p>
        </div>
        <Link href="/upload" className="btn btn-blue shadow-md shadow-blue/20">
          Upload call
        </Link>
      </div>
      
      <div className="mt-8">
        <CallsBoard
          initialCalls={(calls || []) as Array<
            Call & { agents?: { name: string } | null; call_scores?: CallScore[] | CallScore | null }
          >}
        />
      </div>
    </div>
  );
}
