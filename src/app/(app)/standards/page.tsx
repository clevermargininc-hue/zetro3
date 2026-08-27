import { StandardsBoard } from "@/components/standards-board";

export default function StandardsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Audit Standards & SOP Governance</h1>
        <p className="mt-1 text-[13px] text-muted">
          Define scorecard rubrics, compliance rules, and optional organization scripts (including holding procedures) for automated call evaluations.
        </p>
      </div>
      <StandardsBoard />
    </div>
  );
}
