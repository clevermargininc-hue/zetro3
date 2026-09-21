import { StandardsBoard } from "@/components/standards-board";
import { PageHeader } from "@/components/ui";

export default function StandardsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Scorecard"
        description="Add the scorecard you already use. Scoring reads these files before it gives any mark."
      />
      <StandardsBoard />
    </div>
  );
}
