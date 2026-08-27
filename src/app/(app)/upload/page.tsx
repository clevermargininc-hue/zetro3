import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";

export default async function UploadPage() {
  const { user } = await requireUser();
  const teamScope = await getTeamScope(user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto pb-12">
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Upload Call Recordings</h1>
        <p className="mt-1 text-[13px] text-muted">
          Upload one file, many files, or a folder of recordings. Transcription, speaker diarization, and scoring start automatically.
        </p>
      </div>

      <UploadForm teamScope={teamScope} />
    </div>
  );
}
