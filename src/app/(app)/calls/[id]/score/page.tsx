import { ScoreWorkspace } from "@/components/score-workspace";
import { loadOwnedCall } from "@/lib/load-call";

export default async function ScoreCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { call, utterances, score } = await loadOwnedCall(id);

  return (
    <ScoreWorkspace
      initialCall={call}
      initialUtterances={utterances}
      initialScore={score}
    />
  );
}
