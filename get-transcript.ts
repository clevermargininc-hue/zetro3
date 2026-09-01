import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!calls || calls.length === 0) {
    console.log("No calls found in the database.");
    return;
  }

  const latestCall = calls[0];
  console.log(`Latest Call: ${latestCall.title || latestCall.id}`);
  console.log(`Status: ${latestCall.status}`);
  console.log(`Audio Duration: ${latestCall.duration_seconds}s`);
  console.log(`Error Message: ${latestCall.error_message}`);

  const { data: utterances } = await supabase
    .from('utterances')
    .select('*')
    .eq('call_id', latestCall.id)
    .order('sequence', { ascending: true });

  if (!utterances || utterances.length === 0) {
    console.log("No utterances found for this call.");
    return;
  }

  console.log("\n--- TRANSCRIPT ---\n");
  for (const u of utterances) {
    console.log(`[${u.start_ms} - ${u.end_ms}] ${u.role} (${u.speaker_label}): ${u.text}`);
  }
}

main().catch(console.error);
