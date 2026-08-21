import { TranscribeWorkspace } from "@/components/transcribe-workspace";
import { loadOwnedCall } from "@/lib/load-call";

export default async function TranscribeCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { call, utterances, score } = await loadOwnedCall(id);

  return (
    <TranscribeWorkspace
      initialCall={call}
      initialUtterances={utterances}
      initialScore={score}
    />
  );
}
