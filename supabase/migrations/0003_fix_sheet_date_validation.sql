-- The original regular expression used a double backslash in a dollar-quoted
-- PostgreSQL string. That makes valid ISO dates fail validation. Use explicit
-- numeric character classes instead.
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
  if coalesce(p_sheet ->> 'sheet_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'sheet date must be ISO formatted' using errcode = '22023';
  end if;

  sheet_id := (p_sheet ->> 'id')::uuid;
  sheet_day := (p_sheet ->> 'sheet_date')::date;
  if sheet_day > current_date then
    raise exception 'sheet date cannot be in the future' using errcode = '22023';
  end if;
  if coalesce(p_sheet ->> 'collection', '') !~ '^[0-9]+$' then
    raise exception 'collection must be a non-negative whole number of rupees' using errcode = '22023';
  end if;
  collection_value := (p_sheet ->> 'collection')::integer;
  if p_sheet ? 'written_total' and p_sheet ->> 'written_total' is not null and p_sheet ->> 'written_total' <> '' then
    if p_sheet ->> 'written_total' !~ '^[0-9]+$' then
      raise exception 'written total must be a non-negative whole number of rupees' using errcode = '22023';
    end if;
    written_total_value := (p_sheet ->> 'written_total')::integer;
  end if;
  if p_sheet ? 'written_balance' and p_sheet ->> 'written_balance' is not null and p_sheet ->> 'written_balance' <> '' then
    if p_sheet ->> 'written_balance' !~ '^-?[0-9]+$' then
      raise exception 'written balance must be a whole number of rupees' using errcode = '22023';
    end if;
    written_balance_value := (p_sheet ->> 'written_balance')::integer;
  end if;

  expected_photo_path := caller::text || '/' || sheet_id::text || '.jpg';
  if p_sheet ->> 'photo_path' <> expected_photo_path then
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
    if coalesce(expense ->> 'amount', '') !~ '^[0-9]+$' then
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

grant execute on function public.save_daily_sheet(jsonb, jsonb) to authenticated;
