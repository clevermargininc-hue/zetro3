-- Hide call transcripts from the browser. Scoring still reads them with the
-- service-role key in process-call.ts.
-- Run this in the Supabase SQL Editor.

drop policy if exists "utterances_via_call" on public.utterances;
