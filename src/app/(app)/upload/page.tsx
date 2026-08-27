import { UploadForm } from "@/components/upload-form";
import { createClient } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const teamScope = user ? await getTeamScope(user.id) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto pb-12">
      <div className="pb-5 border-b border-line/60">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Upload Call Recording</h1>
        <p className="mt-1 text-[13px] text-muted">
          Upload customer audio files for bilingual transcription, speaker diarization, and automated quality scoring.
        </p>
      </div>

      <UploadForm teamScope={teamScope} />
    </div>
  );
}
