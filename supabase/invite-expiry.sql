-- Invite expiry. Run in the Supabase SQL Editor.

alter table public.workspace_invites
  add column if not exists created_at timestamptz not null default now();

alter table public.workspace_invites
  add column if not exists expires_at timestamptz;

update public.workspace_invites
set expires_at = created_at + interval '14 days'
where expires_at is null;
