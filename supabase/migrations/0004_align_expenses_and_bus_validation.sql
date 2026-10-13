-- Align the ledger with this bus: there is no checker, and the printed fee is
-- the scan fee. Existing checker Betta is retained as cleaner Betta, and the
-- old stand_fee label is corrected to scan_fee without changing any amounts.
alter table public.sheet_expenses drop constraint if exists sheet_expenses_category_check;
alter table public.daily_sheets add column if not exists bus_registration_number text;

update public.daily_sheets sheet
set bus_registration_number = profile.registration_number
from public.bus_profile profile
where profile.owner_id = sheet.owner_id and sheet.bus_registration_number is null;

-- Financial writes go through the validating atomic RPC, not direct table DML.
drop policy if exists "Owners can create their sheets" on public.daily_sheets;
drop policy if exists "Owners can update their sheets" on public.daily_sheets;
drop policy if exists "Owners can delete their sheets" on public.daily_sheets;
drop policy if exists "Owners can create their sheet expenses" on public.sheet_expenses;
drop policy if exists "Owners can update their sheet expenses" on public.sheet_expenses;
drop policy if exists "Owners can delete their sheet expenses" on public.sheet_expenses;

update public.sheet_expenses
set category = 'batha_cleaner'
where category = 'batha_checker';

update public.sheet_expenses
set category = 'scan_fee'
where category = 'stand_fee';

alter table public.sheet_expenses
  add constraint sheet_expenses_category_check
  check (category in (
    'batha_driver', 'batha_conductor', 'batha_cleaner', 'diesel',
    'oil_grease', 'tyre', 'spare_parts', 'workshop', 'scan_fee',
    'washing', 'others'
  ));

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
  sheet.updated_at,
  sheet.bus_registration_number
from public.daily_sheets sheet
left join public.sheet_expenses expense on expense.sheet_id = sheet.id
group by sheet.id;

create or replace function public.save_daily_sheet(p_sheet jsonb, p_expenses jsonb default '[]'::jsonb)
returns public.sheet_summary
language plpgsql
security definer
set search_path = public
as $$
<<sheet_save>>
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
  expected_bus_number text;
  expense jsonb;
  expense_category text;
  expense_amount integer;
  total_expense bigint := 0;
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
  if coalesce(p_sheet ->> 'sheet_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'sheet date must be ISO formatted' using errcode = '22023';
  end if;
  sheet_id := (p_sheet ->> 'id')::uuid;
  sheet_day := (p_sheet ->> 'sheet_date')::date;
  if sheet_day > timezone('Asia/Kolkata', now())::date then
    raise exception 'sheet date cannot be in the future' using errcode = '22023';
  end if;
  if coalesce(p_sheet ->> 'collection', '') !~ '^[0-9]+$' then
    raise exception 'collection must be a non-negative whole number of rupees' using errcode = '22023';
  end if;
  if (p_sheet ->> 'collection')::numeric > 2147483647 then
    raise exception 'collection is larger than the supported whole-rupee limit' using errcode = '22023';
  end if;
  collection_value := (p_sheet ->> 'collection')::integer;
  if coalesce(trim(p_sheet ->> 'driver_name'), '') = ''
     or coalesce(trim(p_sheet ->> 'conductor_name'), '') = ''
     or coalesce(trim(p_sheet ->> 'cleaner_name'), '') = '' then
    raise exception 'driver, conductor, and cleaner names are required' using errcode = '22023';
  end if;
  if p_sheet ? 'written_total' and p_sheet ->> 'written_total' is not null and p_sheet ->> 'written_total' <> '' then
    if p_sheet ->> 'written_total' !~ '^[0-9]+$' then
      raise exception 'written total must be a non-negative whole number of rupees' using errcode = '22023';
    end if;
    if (p_sheet ->> 'written_total')::numeric > 2147483647 then
      raise exception 'written total is larger than the supported whole-rupee limit' using errcode = '22023';
    end if;
    written_total_value := (p_sheet ->> 'written_total')::integer;
  end if;
  if p_sheet ? 'written_balance' and p_sheet ->> 'written_balance' is not null and p_sheet ->> 'written_balance' <> '' then
    if p_sheet ->> 'written_balance' !~ '^-?[0-9]+$' then
      raise exception 'written balance must be a whole number of rupees' using errcode = '22023';
    end if;
    if abs((p_sheet ->> 'written_balance')::numeric) > 2147483648 then
      raise exception 'written balance is larger than the supported whole-rupee limit' using errcode = '22023';
    end if;
    written_balance_value := (p_sheet ->> 'written_balance')::integer;
  end if;

  select registration_number into expected_bus_number
  from public.bus_profile where owner_id = caller;
  if expected_bus_number is null then
    raise exception 'bus number is not defined in Settings' using errcode = '22023';
  end if;
  if upper(regexp_replace(coalesce(p_sheet ->> 'bus_registration_number', ''), '[^A-Za-z0-9]', '', 'g'))
     <> upper(regexp_replace(expected_bus_number, '[^A-Za-z0-9]', '', 'g')) then
    raise exception 'bus number does not match the registered bus in Settings' using errcode = '22023';
  end if;

  expected_photo_path := caller::text || '/' || sheet_id::text || '.jpg';
  if coalesce(p_sheet ->> 'photo_path', '') <> expected_photo_path then
    raise exception 'photo path must belong to the authenticated owner and sheet id' using errcode = '42501';
  end if;
  select id into existing_sheet_id from public.daily_sheets
  where owner_id = caller and sheet_date = sheet_day and id <> sheet_id;
  if existing_sheet_id is not null then
    raise exception 'sheet_already_exists' using errcode = '23505', detail = existing_sheet_id::text;
  end if;
  select owner_id into sheet_owner from public.daily_sheets where id = sheet_id;
  if sheet_owner is not null and sheet_owner <> caller then
    raise exception 'sheet does not belong to the authenticated owner' using errcode = '42501';
  end if;

  insert into public.daily_sheets (
    id, owner_id, sheet_date, bus_registration_number, driver_name, conductor_name, checker_name, cleaner_name,
    collection, written_total, written_balance, notes, photo_path
  ) values (
    sheet_id, caller, sheet_day, expected_bus_number,
    nullif(trim(p_sheet ->> 'driver_name'), ''), nullif(trim(p_sheet ->> 'conductor_name'), ''),
    null, nullif(trim(p_sheet ->> 'cleaner_name'), ''), collection_value,
    written_total_value, written_balance_value, nullif(trim(p_sheet ->> 'notes'), ''), expected_photo_path
  ) on conflict (id) do update set
    sheet_date = excluded.sheet_date,
    bus_registration_number = excluded.bus_registration_number,
    driver_name = excluded.driver_name,
    conductor_name = excluded.conductor_name,
    checker_name = null,
    cleaner_name = excluded.cleaner_name,
    collection = excluded.collection,
    written_total = excluded.written_total,
    written_balance = excluded.written_balance,
    notes = excluded.notes,
    photo_path = excluded.photo_path
  where public.daily_sheets.owner_id = caller;

  delete from public.sheet_expenses where sheet_id = sheet_save.sheet_id and owner_id = caller;
  for expense in select value from jsonb_array_elements(p_expenses)
  loop
    expense_category := expense ->> 'category';
    if expense_category is null or expense_category not in (
      'batha_driver', 'batha_conductor', 'batha_cleaner', 'diesel',
      'oil_grease', 'tyre', 'spare_parts', 'workshop', 'scan_fee', 'washing', 'others'
    ) then
      raise exception 'invalid expense category' using errcode = '22023';
    end if;
    if expense_category <> 'others' and expense_category = any(seen_categories) then
      raise exception 'each standard expense category can be entered once' using errcode = '22023';
    end if;
    if coalesce(expense ->> 'amount', '') !~ '^[0-9]+$' then
      raise exception 'expense amount must be a non-negative whole number of rupees' using errcode = '22023';
    end if;
    if (expense ->> 'amount')::numeric > 2147483647 then
      raise exception 'expense amount is larger than the supported whole-rupee limit' using errcode = '22023';
    end if;
    expense_amount := (expense ->> 'amount')::integer;
    total_expense := total_expense + expense_amount;
    if total_expense > 2147483647 then
      raise exception 'total operating expense is larger than the supported whole-rupee limit' using errcode = '22023';
    end if;
    if expense_amount > 0 then
      insert into public.sheet_expenses (owner_id, sheet_id, category, amount, note)
      values (caller, sheet_id, expense_category, expense_amount, nullif(trim(expense ->> 'note'), ''));
    end if;
    seen_categories := array_append(seen_categories, expense_category);
  end loop;
  return (select summary from public.sheet_summary summary where summary.id = sheet_id);
end;
$$;

grant execute on function public.save_daily_sheet(jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
