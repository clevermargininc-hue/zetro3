import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerJourneyDetail } from "@/lib/customer-journey-service";
import { CustomerJourneyView } from "@/components/customer-journey-view";

export const dynamic = "force-dynamic";

export default async function CustomerJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const detail = await getCustomerJourneyDetail(user.id, id);

  if (!detail.customer) {
    notFound();
  }

  return (
    <CustomerJourneyView
      initialDetail={{
        ...detail,
        customer: detail.customer,
      }}
    />
  );
}
