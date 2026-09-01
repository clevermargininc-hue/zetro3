-- Show call transcripts in the app again (select for the call owner).
-- Run this in the Supabase SQL Editor if hide-transcripts.sql was applied.

drop policy if exists "utterances_via_call" on public.utterances;
create policy "utterances_via_call" on public.utterances
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = utterances.call_id and c.user_id = auth.uid()
    )
  );
