export function firstContactResolvedCount(issues: ReadonlyArray<{status: string; total_calls: number; reopened_count: number}>) {
  return issues.filter(issue => (issue.status === "resolved" || issue.status === "closed") && issue.total_calls === 1 && issue.reopened_count === 0).length;
}

export function issueReviewFlags(reviewType: string, catalogueRequiresReview = false): {human_verified?: boolean; needs_review?: boolean} {
  if (reviewType === "investigation_note" || reviewType === "assign_team") return {};
  return { human_verified: true, needs_review: catalogueRequiresReview };
}

export function companyCategory(issue: {catalogue_issue_category_id?: string | null; catalogue_issue_category_name?: string | null}) {
  return {id: issue.catalogue_issue_category_id || "unclassified", label: issue.catalogue_issue_category_name || "Unclassified"};
}

export function lifecycleReviewFields(status: string, previousReopenedCount: number, previousStatus: string, now: string) {
  const resolved = status === "resolved" || status === "closed";
  return {
    resolved_at: resolved ? now : null,
    ...(status === "reopened" && previousStatus !== "reopened" ? { reopened_count: previousReopenedCount + 1 } : {}),
    ...(!resolved ? { resolution_confirmation: "unconfirmed" } : {}),
  };
}
