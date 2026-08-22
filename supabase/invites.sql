-- Run in the Supabase SQL Editor so invites can be accepted from an emailed link.

alter table public.workspace_invites
  add column if not exists token uuid unique default gen_random_uuid();
