-- Country of operation. Tanzania = Kiswahili + English. Other countries = English only.

alter table public.workspaces
  add column if not exists country text;

alter table public.profiles
  add column if not exists country text;

update public.workspaces
  set country = 'Tanzania'
  where country is null;
