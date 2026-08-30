import type { ReactNode } from "react";
import { UploadSectionNav } from "@/components/upload-section-nav";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";
import { pipelineQueueCounts } from "@/lib/format";

export default async function UploadLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();
  const teamScope = await getTeamScope(user.id);
  const { data } = await supabase.from("calls").select("status").in("user_id", teamScope);
  const counts = pipelineQueueCounts((data || []).map((row) => row.status as string));

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
