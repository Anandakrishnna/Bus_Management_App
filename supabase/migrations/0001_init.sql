-- BusLedger MVP foundation: one owner, one bus, verified scanned sheets.
-- Apply through the Supabase CLI or dashboard migration runner. Do not run this
-- against a database that contains an unrelated schema with these object names.

create extension if not exists pgcrypto;

create table public.bus_profile (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  registration_number text not null check (char_length(trim(registration_number)) > 0),
  name text,
  owner_name text,
  phone_number text,
  route text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.daily_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sheet_date date not null,
  driver_name text,
  conductor_name text,
  checker_name text,
  cleaner_name text,
  collection integer not null check (collection >= 0),
  written_total integer check (written_total is null or written_total >= 0),
  written_balance integer,
  notes text,
  photo_path text not null,
  entry_source text not null default 'scan' check (entry_source = 'scan'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_sheets_owner_date_key unique (owner_id, sheet_date),
  constraint daily_sheets_photo_path_key unique (photo_path)
);

create table public.sheet_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sheet_id uuid not null references public.daily_sheets(id) on delete cascade,
  category text not null check (category in (
    'batha_driver', 'batha_conductor', 'batha_checker', 'batha_cleaner',
    'diesel', 'oil_grease', 'tyre', 'spare_parts', 'workshop', 'stand_fee',
    'washing', 'others'
  )),
  amount integer not null check (amount >= 0),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index daily_sheets_owner_date_desc_idx on public.daily_sheets (owner_id, sheet_date desc);
create index sheet_expenses_sheet_id_idx on public.sheet_expenses (sheet_id);
create index sheet_expenses_owner_id_idx on public.sheet_expenses (owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger bus_profile_set_updated_at
before update on public.bus_profile
for each row execute function public.set_updated_at();

create trigger daily_sheets_set_updated_at
before update on public.daily_sheets
for each row execute function public.set_updated_at();

-- A direct child-row write is allowed only when its owner matches its parent.
create or replace function public.enforce_expense_parent_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_owner uuid;
begin
  select owner_id into parent_owner from public.daily_sheets where id = new.sheet_id;
  if parent_owner is null or parent_owner <> new.owner_id then
    raise exception 'expense owner must match the parent sheet owner' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger sheet_expenses_enforce_parent_owner
before insert or update of owner_id, sheet_id on public.sheet_expenses
for each row execute function public.enforce_expense_parent_owner();

alter table public.bus_profile enable row level security;
alter table public.daily_sheets enable row level security;
alter table public.sheet_expenses enable row level security;

create policy "Owners can read their bus profile"
on public.bus_profile for select to authenticated
using (owner_id = auth.uid());

create policy "Owners can create their bus profile"
on public.bus_profile for insert to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update their bus profile"
on public.bus_profile for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners can read their sheets"
on public.daily_sheets for select to authenticated
using (owner_id = auth.uid());

create policy "Owners can create their sheets"
on public.daily_sheets for insert to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update their sheets"
on public.daily_sheets for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners can delete their sheets"
on public.daily_sheets for delete to authenticated
using (owner_id = auth.uid());

create policy "Owners can read their sheet expenses"
on public.sheet_expenses for select to authenticated
using (owner_id = auth.uid());

create policy "Owners can create their sheet expenses"
on public.sheet_expenses for insert to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.daily_sheets sheet
    where sheet.id = sheet_expenses.sheet_id and sheet.owner_id = auth.uid()
  )
);

create policy "Owners can update their sheet expenses"
on public.sheet_expenses for update to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.daily_sheets sheet
    where sheet.id = sheet_expenses.sheet_id and sheet.owner_id = auth.uid()
  )
);

create policy "Owners can delete their sheet expenses"
on public.sheet_expenses for delete to authenticated
using (owner_id = auth.uid());

-- Views are explicitly security invoker so they obey the caller's RLS policies.
create or replace view public.sheet_summary
with (security_invoker = true)
as
select
  sheet.id,
  sheet.owner_id,
  sheet.sheet_date,
  sheet.collection,
  coalesce(sum(expense.amount), 0)::integer as total_operating_expense,
  (sheet.collection - coalesce(sum(expense.amount), 0))::integer as daily_balance,
  sheet.written_total,
  sheet.written_balance,
  (sheet.written_total is not null and sheet.written_total <> coalesce(sum(expense.amount), 0)) as total_mismatch,
  (sheet.written_balance is not null and sheet.written_balance <> sheet.collection - coalesce(sum(expense.amount), 0)) as balance_mismatch,
  sheet.photo_path,
  sheet.created_at,
  sheet.updated_at
from public.daily_sheets sheet
left join public.sheet_expenses expense on expense.sheet_id = sheet.id
group by sheet.id;

create or replace function public.get_monthly_summary(p_month date)
returns table (
  total_collection bigint,
  total_operating_expense bigint,
  operating_balance bigint,
  days_entered integer,
  mismatch_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(collection), 0)::bigint,
    coalesce(sum(total_operating_expense), 0)::bigint,
    coalesce(sum(daily_balance), 0)::bigint,
    count(*)::integer,
    count(*) filter (where total_mismatch or balance_mismatch)::integer
  from public.sheet_summary
  where owner_id = auth.uid()
    and sheet_date >= date_trunc('month', p_month)::date
    and sheet_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

create or replace function public.get_monthly_expense_breakdown(p_month date)
returns table (category text, total_amount bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select expense.category, sum(expense.amount)::bigint
  from public.sheet_expenses expense
  join public.daily_sheets sheet on sheet.id = expense.sheet_id
  where sheet.owner_id = auth.uid()
    and sheet.sheet_date >= date_trunc('month', p_month)::date
    and sheet.sheet_date < (date_trunc('month', p_month) + interval '1 month')::date
  group by expense.category
  order by expense.category;
$$;

-- This is the only financial write path used by the app. It saves a sheet and
-- replaces all of its expenses inside one database transaction.
create or replace function public.save_daily_sheet(p_sheet jsonb, p_expenses jsonb default '[]'::jsonb)
returns public.sheet_summary
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  sheet_id uuid;
  existing_sheet_id uuid;
  sheet_owner uuid;
  sheet_day date;
  collection_value integer;
  written_total_value integer;
  written_balance_value integer;
  expected_photo_path text;
  expense jsonb;
  expense_category text;
  expense_amount integer;
  seen_categories text[] := '{}';
begin
  if caller is null then
    raise exception 'authentication is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_sheet) <> 'object' or jsonb_typeof(p_expenses) <> 'array' then
    raise exception 'invalid sheet payload' using errcode = '22023';
  end if;
  if coalesce(p_sheet ->> 'id', '') !~ '^[0-9a-fA-F-]{36}$' then
    raise exception 'a client-generated sheet id is required' using errcode = '22023';
  end if;
  if coalesce(p_sheet ->> 'sheet_date', '') !~ '^\\d{4}-\\d{2}-\\d{2}$' then
    raise exception 'sheet date must be ISO formatted' using errcode = '22023';
  end if;

  sheet_id := (p_sheet ->> 'id')::uuid;
  sheet_day := (p_sheet ->> 'sheet_date')::date;
  if sheet_day > current_date then
    raise exception 'sheet date cannot be in the future' using errcode = '22023';
  end if;
  if coalesce(p_sheet ->> 'collection', '') !~ '^\\d+$' then
    raise exception 'collection must be a non-negative whole number of rupees' using errcode = '22023';
  end if;
  collection_value := (p_sheet ->> 'collection')::integer;
  if p_sheet ? 'written_total' and p_sheet ->> 'written_total' is not null and p_sheet ->> 'written_total' <> '' then
    if p_sheet ->> 'written_total' !~ '^\\d+$' then
      raise exception 'written total must be a non-negative whole number of rupees' using errcode = '22023';
    end if;
    written_total_value := (p_sheet ->> 'written_total')::integer;
  end if;
  if p_sheet ? 'written_balance' and p_sheet ->> 'written_balance' is not null and p_sheet ->> 'written_balance' <> '' then
    if p_sheet ->> 'written_balance' !~ '^-?\\d+$' then
      raise exception 'written balance must be a whole number of rupees' using errcode = '22023';
    end if;
    written_balance_value := (p_sheet ->> 'written_balance')::integer;
  end if;

  expected_photo_path := caller::text || '/' || sheet_id::text || '.jpg';
  if p_sheet ->> 'photo_path' <> expected_photo_path then
    raise exception 'photo path must belong to the authenticated owner and sheet id' using errcode = '42501';
  end if;

  select id into existing_sheet_id
  from public.daily_sheets
  where owner_id = caller and sheet_date = sheet_day and id <> sheet_id;
  if existing_sheet_id is not null then
    raise exception 'sheet_already_exists' using errcode = '23505', detail = existing_sheet_id::text;
  end if;

  select owner_id into sheet_owner from public.daily_sheets where id = sheet_id;
  if sheet_owner is not null and sheet_owner <> caller then
    raise exception 'sheet does not belong to the authenticated owner' using errcode = '42501';
  end if;

  insert into public.daily_sheets (
    id, owner_id, sheet_date, driver_name, conductor_name, checker_name, cleaner_name,
    collection, written_total, written_balance, notes, photo_path
  ) values (
    sheet_id, caller, sheet_day,
    nullif(trim(p_sheet ->> 'driver_name'), ''), nullif(trim(p_sheet ->> 'conductor_name'), ''),
    nullif(trim(p_sheet ->> 'checker_name'), ''), nullif(trim(p_sheet ->> 'cleaner_name'), ''),
    collection_value, written_total_value, written_balance_value, nullif(trim(p_sheet ->> 'notes'), ''), expected_photo_path
  ) on conflict (id) do update set
    sheet_date = excluded.sheet_date,
    driver_name = excluded.driver_name,
    conductor_name = excluded.conductor_name,
    checker_name = excluded.checker_name,
    cleaner_name = excluded.cleaner_name,
    collection = excluded.collection,
    written_total = excluded.written_total,
    written_balance = excluded.written_balance,
    notes = excluded.notes,
    photo_path = excluded.photo_path
  where public.daily_sheets.owner_id = caller;

  delete from public.sheet_expenses where sheet_expenses.sheet_id = sheet_id and sheet_expenses.owner_id = caller;
  for expense in select value from jsonb_array_elements(p_expenses)
  loop
    expense_category := expense ->> 'category';
    if expense_category not in (
      'batha_driver', 'batha_conductor', 'batha_checker', 'batha_cleaner',
      'diesel', 'oil_grease', 'tyre', 'spare_parts', 'workshop', 'stand_fee', 'washing', 'others'
    ) then
      raise exception 'invalid expense category' using errcode = '22023';
    end if;
    if expense_category <> 'others' and expense_category = any(seen_categories) then
      raise exception 'each standard expense category can be entered once' using errcode = '22023';
    end if;
    if coalesce(expense ->> 'amount', '') !~ '^\\d+$' then
      raise exception 'expense amount must be a non-negative whole number of rupees' using errcode = '22023';
    end if;
    expense_amount := (expense ->> 'amount')::integer;
    if expense_amount > 0 then
      insert into public.sheet_expenses (owner_id, sheet_id, category, amount, note)
      values (caller, sheet_id, expense_category, expense_amount, nullif(trim(expense ->> 'note'), ''));
    end if;
    seen_categories := array_append(seen_categories, expense_category);
  end loop;

  return (select summary from public.sheet_summary summary where summary.id = sheet_id);
end;
$$;

grant select, insert, update, delete on public.bus_profile, public.daily_sheets, public.sheet_expenses to authenticated;
grant select on public.sheet_summary to authenticated;
grant execute on function public.get_monthly_summary(date), public.get_monthly_expense_breakdown(date), public.save_daily_sheet(jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public)
values ('sheet-photos', 'sheet-photos', false)
on conflict (id) do update set public = false;

create policy "Owners can read their private sheet photos"
on storage.objects for select to authenticated
using (bucket_id = 'sheet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can upload their private sheet photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'sheet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can update their private sheet photos"
on storage.objects for update to authenticated
using (bucket_id = 'sheet-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'sheet-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can delete their private sheet photos"
on storage.objects for delete to authenticated
using (bucket_id = 'sheet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
