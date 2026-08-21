import { StandardsBoard } from "@/components/standards-board";

export default function StandardsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <p className="page-kicker">Configuration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Audit Standards</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted leading-relaxed">
          Upload your company's guidelines, rubrics, and compliance rules. 
          The system uses these documents to accurately evaluate your calls during a custom audit.
        </p>
      </div>
      <StandardsBoard />
    </div>
  );
}
