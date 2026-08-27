import { UploadForm } from "@/components/upload-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/workspaces";

export default async function UploadPage() {
  const { user } = await requireUser();
  const teamScope = await getTeamScope(user.id);

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      <PageHeader
        title="Upload Call Recordings"
        description="Upload one file, many files, a folder, or a ZIP of recordings. Transcription, speaker diarization, and scoring start automatically."
      />

      <UploadForm teamScope={teamScope} />
    </div>
  );
}
