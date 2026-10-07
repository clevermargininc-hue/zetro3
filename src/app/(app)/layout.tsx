import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { PlanBanner } from "@/components/plan-banner";
import { PresencePing } from "@/components/presence-ping";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getPlanStatus, type PlanStatus } from "@/lib/plans";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const memberQuery = supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const profileQuery = supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const [{ data: memberRow }, profileRes] = await Promise.all([memberQuery, profileQuery]);

  let workspaceName: string | null = null;
  let plan: string | null = null;
  let username: string | null = null;
  let displayName: string | null = null;
  let planStatus: PlanStatus | null = null;
  if (memberRow?.workspace_id) {
    const [{ data: workspace }, status] = await Promise.all([
      supabase.from("workspaces").select("name, plan").eq("id", memberRow.workspace_id).maybeSingle(),
      getPlanStatus(memberRow.workspace_id as string).catch(() => null),
    ]);
    workspaceName = (workspace?.name as string) || null;
    plan = (workspace?.plan as string) || null;
    planStatus = status;
  }
  if (profileRes.error && /username/i.test(profileRes.error.message)) {
    const fallback = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = (fallback.data?.full_name as string) || null;
  } else if (!profileRes.error) {
    username = (profileRes.data?.username as string) || null;
    displayName = (profileRes.data?.full_name as string) || null;
  }
  if (!displayName) {
    const meta = user.user_metadata || {};
    displayName =
      [meta.full_name, meta.name, meta.given_name]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .find(Boolean) ||
      (user.email || "").split("@")[0] ||
      null;
  }

  return (
    <div className="min-h-full bg-bg print:block lg:flex print:bg-[#FFFFFF]">
      <AppNav
        email={user.email}
        username={username}
        displayName={displayName}
        workspaceName={workspaceName}
        plan={plan}
        isPlatformAdmin={isPlatformAdmin(user.email)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-7 print:max-w-none print:px-0 print:py-0 lg:px-8">
          <PlanBanner status={planStatus} />
          {children}
          <PresencePing />
        </main>
      </div>
    </div>
  );
}
