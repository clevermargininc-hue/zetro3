import { StandardsBoard } from "@/components/standards-board";
import { PageHeader } from "@/components/ui";

export default function StandardsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Audit Standards & SOP Governance"
        description="Define scorecard rubrics, compliance rules, and optional organization scripts (including holding procedures) for automated call evaluations."
      />
      <StandardsBoard />
    </div>
  );
}
