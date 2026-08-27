-- Additive migration: optional company holding / wait-on-hold procedures.
-- Dashboard → SQL Editor → paste → Run
-- Safe to re-run. Does not make holding required for SOP scoring.

alter table public.qa_documents
  drop constraint if exists qa_documents_kind_check;

alter table public.qa_documents
  add constraint qa_documents_kind_check
  check (kind in ('document', 'scorecard', 'compliance', 'opening', 'closing', 'holding'));
