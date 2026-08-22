-- Additive migration: org opening/closing call scripts (shared by all agents).
-- Dashboard → SQL Editor → paste → Run

alter table public.qa_documents
  drop constraint if exists qa_documents_kind_check;

alter table public.qa_documents
  add constraint qa_documents_kind_check
  check (kind in ('document', 'scorecard', 'compliance', 'opening', 'closing'));
