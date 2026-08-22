import { StandardsBoard } from "@/components/standards-board";

export default function StandardsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <p className="page-kicker">Configuration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Audit Standards</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted leading-relaxed">
          Upload scorecard files for custom audits, plus organization-wide opening and closing scripts
          so transcription and scoring pick up your key terms.
        </p>
      </div>
      <StandardsBoard />
    </div>
  );
}
