-- Keep sign-up contact fields in the owner-scoped bus profile.
-- Nullable columns preserve profiles created before these fields existed.
alter table public.bus_profile
  add column if not exists owner_name text,
  add column if not exists phone_number text;
