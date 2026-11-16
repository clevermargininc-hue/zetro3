import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerIntelligenceOverview } from "@/lib/customer-journey-service";
import { CustomerIntelligenceBoard } from "@/components/customer-intelligence-board";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const pick = (key: string) => (typeof sp[key] === "string" ? sp[key] : undefined);

  const filters = {
    search: pick("search"),
    category: pick("category"),
    product: pick("product"),
    service: pick("service"),
    serviceArea: pick("serviceArea"),
    department: pick("department"),
    status: pick("status"),
    rootCause: pick("rootCause"),
    needsReviewOnly: pick("needsReviewOnly") === "true",
    unresolvedOnly: pick("unresolvedOnly") === "true",
    pageSize: 100,
  };

  const overview = await getCustomerIntelligenceOverview(user.id, filters);

  return (
    <CustomerIntelligenceBoard
      initialData={overview}
      initialFilters={filters}
      initialFocusCustomerId={pick("customer")}
      initialFocusIssueId={pick("issue")}
    />
  );
}
