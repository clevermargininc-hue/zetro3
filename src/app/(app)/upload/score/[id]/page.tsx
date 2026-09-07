import { ScoreWorkspace } from "@/components/score-workspace";
import { loadOwnedCall } from "@/lib/load-call";

export default async function UploadScoreCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { call, score, hasTranscript } = await loadOwnedCall(id);

  return (
    <ScoreWorkspace
      initialCall={call}
      initialScore={score}
      initialHasTranscript={hasTranscript}
    />
  );
}
