import type { ReactNode } from "react";
import { UploadSectionNav } from "@/components/upload-section-nav";
import { requireUser } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all";
import { getTeamScope } from "@/lib/workspaces";
import { pipelineQueueCounts } from "@/lib/format";

export default async function UploadLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const page = await fetchAllRows<{ status: string }>((from, to) =>
    supabase.from("calls").select("status").in("user_id", teamScope).order("id").range(from, to),
  );
  if (page.error) throw new Error(page.error.message);
  const counts = pipelineQueueCounts(page.data.map((row) => row.status));

  return (
    <div className="space-y-6 pb-10">
      <UploadSectionNav
        prepareCount={counts.prepare}
        scoreCount={counts.score}
        teamScope={teamScope}
      />
      {children}
    </div>
  );
}
