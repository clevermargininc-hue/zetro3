-- Metric evidence snippets on call scores (quote + timestamp per dimension).
-- Dashboard → SQL Editor → paste → Run

alter table public.call_scores
  add column if not exists metric_evidence jsonb not null default '{}'::jsonb;
