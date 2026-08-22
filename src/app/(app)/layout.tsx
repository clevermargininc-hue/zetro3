import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
  const profileRes = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profileRes.error) {
    username = (profileRes.data?.username as string) || null;
  }

  return (
    <div className="min-h-full bg-white print:block lg:flex">
      <AppNav
        email={user.email}
        username={username}
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
