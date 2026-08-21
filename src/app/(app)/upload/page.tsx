import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto pt-10">
      <div className="text-center">
        <p className="page-kicker justify-center">Ingest</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Upload a recording</h1>
        <p className="mt-3 text-[15px] text-muted leading-relaxed mx-auto">
          Save the file to this workspace. When upload completes, continue to transcription from the card below.
        </p>
      </div>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
