-- Additive migration for existing Zetro projects.
-- Dashboard → SQL Editor → paste → Run
-- Re-run this file if you already applied an older version: audit_mode is new.
alter table public.profiles
  add column if not exists auto_audit boolean not null default false;

alter table public.call_scores
  add column if not exists compliance_findings jsonb not null default '[]'::jsonb;

alter table public.call_scores
  add column if not exists standards_used jsonb not null default '[]'::jsonb;

alter table public.call_scores
  add column if not exists audit_mode text not null default 'documents';

create table if not exists public.qa_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('document', 'scorecard', 'compliance')),
  title text not null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists qa_documents_user_id_idx
  on public.qa_documents (user_id, kind, created_at desc);

create table if not exists public.qa_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.qa_documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  chunk_index int not null,
  content text not null,
  embedding jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists qa_document_chunks_document_idx
  on public.qa_document_chunks (document_id);
create index if not exists qa_document_chunks_user_idx
  on public.qa_document_chunks (user_id, kind);

alter table public.qa_documents enable row level security;
alter table public.qa_document_chunks enable row level security;

drop policy if exists "qa_documents_own" on public.qa_documents;
create policy "qa_documents_own" on public.qa_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "qa_chunks_own" on public.qa_document_chunks;
create policy "qa_chunks_own" on public.qa_document_chunks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('qa-documents', 'qa-documents', false)
on conflict (id) do nothing;

drop policy if exists "qa_documents_insert_own" on storage.objects;
create policy "qa_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "qa_documents_select_own" on storage.objects;
create policy "qa_documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "qa_documents_delete_own" on storage.objects;
create policy "qa_documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'qa-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );
