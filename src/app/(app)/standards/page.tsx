import { StandardsBoard } from "@/components/standards-board";
import { PageHeader } from "@/components/ui";

export default function StandardsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Audit Standards & SOP Governance"
        description="Upload scorecard, compliance, and process files. Quality audit reads these files before it assigns any score."
      />
      <StandardsBoard />
    </div>
  );
}
