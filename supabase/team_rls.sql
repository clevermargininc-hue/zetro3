-- Run this snippet in the Supabase SQL Editor to enable team-wide sharing of Calls, Agents, and Documents

-- 1. Helper function to check if a user is in the same team workspace
create or replace function public.is_team_member(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid()
    and m2.user_id = target_user_id
  );
$$;

-- 2. Helper function to check team membership safely from text (for Storage buckets)
create or replace function public.is_team_member_text(target_user_id_text text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_uuid uuid;
begin
  target_uuid := target_user_id_text::uuid;
  return exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid()
    and m2.user_id = target_uuid
  );
exception when invalid_text_representation then
  return false;
end;
$$;

-- 3. Update Database RLS Policies
drop policy if exists "agents_own" on public.agents;
drop policy if exists "agents_team" on public.agents;
create policy "agents_team" on public.agents
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "calls_own" on public.calls;
drop policy if exists "calls_team" on public.calls;
create policy "calls_team" on public.calls
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "utterances_via_call" on public.utterances;
drop policy if exists "utterances_via_call_team" on public.utterances;
create policy "utterances_via_call_team" on public.utterances
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = utterances.call_id and (c.user_id = auth.uid() or public.is_team_member(c.user_id))
    )
  );

drop policy if exists "scores_via_call" on public.call_scores;
drop policy if exists "scores_via_call_team" on public.call_scores;
create policy "scores_via_call_team" on public.call_scores
  for select to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = call_scores.call_id and (c.user_id = auth.uid() or public.is_team_member(c.user_id))
    )
  );

drop policy if exists "qa_documents_own" on public.qa_documents;
drop policy if exists "qa_documents_team" on public.qa_documents;
create policy "qa_documents_team" on public.qa_documents
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

drop policy if exists "qa_chunks_own" on public.qa_document_chunks;
drop policy if exists "qa_chunks_team" on public.qa_document_chunks;
create policy "qa_chunks_team" on public.qa_document_chunks
  for all to authenticated
  using (user_id = auth.uid() or public.is_team_member(user_id))
  with check (user_id = auth.uid() or public.is_team_member(user_id));

-- 4. Update Storage RLS Policies (Allow playing audio and viewing docs from team members)
drop policy if exists "call_audio_select_own" on storage.objects;
drop policy if exists "call_audio_select_team" on storage.objects;
create policy "call_audio_select_team" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'call-audio'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_team_member_text(split_part(name, '/', 1)))
  );

drop policy if exists "qa_documents_select_own" on storage.objects;
drop policy if exists "qa_documents_select_team" on storage.objects;
create policy "qa_documents_select_team" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qa-documents'
    and (split_part(name, '/', 1) = auth.uid()::text or public.is_team_member_text(split_part(name, '/', 1)))
  );
