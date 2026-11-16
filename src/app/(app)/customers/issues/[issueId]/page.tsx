import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIssueInvestigationDetail } from "@/lib/customer-journey-service";
import { IssueInvestigationView } from "@/components/issue-investigation-view";

export const dynamic = "force-dynamic";

export default async function IssueInvestigationPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { issueId } = await params;
  const detail = await getIssueInvestigationDetail(user.id, issueId);

  if (!detail.issue) {
    notFound();
  }

  return (
    <IssueInvestigationView
      initialDetail={{
        ...detail,
        issue: detail.issue,
      }}
    />
  );
}
