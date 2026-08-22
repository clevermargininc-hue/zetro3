-- Run this in the Supabase SQL Editor so profiles can store a public username.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;
