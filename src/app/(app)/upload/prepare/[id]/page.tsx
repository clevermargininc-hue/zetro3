import { TranscribeWorkspace } from "@/components/transcribe-workspace";
import { loadOwnedCall } from "@/lib/load-call";

export default async function UploadPrepareCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { call, score, hasTranscript } = await loadOwnedCall(id);

  return (
    <TranscribeWorkspace
      initialCall={call}
      initialScore={score}
      initialHasTranscript={hasTranscript}
    />
  );
}
