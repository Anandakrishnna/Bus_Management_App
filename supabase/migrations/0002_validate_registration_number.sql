-- Enforce the normalized Indian vehicle-registration format server-side as well.
-- Examples: KL10Q8081, KL07AB1234. Client input removes spaces and hyphens first.

alter table public.bus_profile
  drop constraint if exists bus_profile_registration_number_check;

alter table public.bus_profile
  add constraint bus_profile_registration_number_check
  check (registration_number ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$') not valid;

-- NOT VALID keeps this migration safe for a profile created before validation
-- was introduced, while enforcing the format for every new or updated profile.
