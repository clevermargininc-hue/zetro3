import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto pt-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue/10 text-blue font-bold text-[11px] tracking-[0.2em] uppercase mb-4 mx-auto">
           Ingest
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Upload Recording</h1>
        <p className="mt-4 text-[16px] text-muted leading-relaxed max-w-lg mx-auto">
          Securely upload call recordings to your workspace. The AI will process the audio, detect speakers, and prepare it for quality auditing.
        </p>
      </div>
      <div>
        <UploadForm />
      </div>
    </div>
  );
}
