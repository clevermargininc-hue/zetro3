-- Sales / talk-to-sales intake. Run in the Supabase SQL Editor if missing.

create table if not exists public.sales_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  company_name text not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists sales_requests_created_at_idx
  on public.sales_requests (created_at desc);

alter table public.sales_requests enable row level security;
