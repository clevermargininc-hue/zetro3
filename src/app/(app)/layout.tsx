import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const { data: memberRow } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let workspaceName: string | null = null;
  let plan: string | null = null;
  if (memberRow?.workspace_id) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name, plan")
      .eq("id", memberRow.workspace_id)
      .maybeSingle();
    workspaceName = (workspace?.name as string) || null;
    plan = (workspace?.plan as string) || null;
  }

  let username: string | null = null;
  let displayName: string | null = null;
  const profileRes = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", user.id)
    .maybeSingle();
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
    <div className="min-h-full bg-white print:block lg:flex">
      <AppNav
        email={user.email}
        username={username}
        displayName={displayName}
        workspaceName={workspaceName}
        plan={plan}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 print:max-w-none print:px-0 print:py-0 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
