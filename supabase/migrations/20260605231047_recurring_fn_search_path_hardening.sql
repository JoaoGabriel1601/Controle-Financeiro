-- Fixa search_path nas funções auxiliares de recorrência (resolve o advisor
-- function_search_path_mutable). Ambas usam só built-ins (pg_catalog), então
-- search_path vazio é seguro.
create or replace function public.next_recurring_date(due date, freq text, dom int)
returns date
language sql
immutable
set search_path to ''
as $$
  select case freq
    when 'weekly' then due + 7
    when 'yearly' then
      make_date(
        extract(year from due)::int + 1,
        extract(month from due)::int,
        least(
          coalesce(dom, extract(day from due)::int),
          extract(day from (
            date_trunc('month', make_date(extract(year from due)::int + 1, extract(month from due)::int, 1))
            + interval '1 month - 1 day'
          ))::int
        )
      )
    else
      (
        date_trunc('month', due) + interval '1 month'
        + (least(
             coalesce(dom, extract(day from due)::int),
             extract(day from (date_trunc('month', due) + interval '2 month - 1 day'))::int
           ) - 1) * interval '1 day'
      )::date
  end
$$;

create or replace function public.set_recurring_day_of_month()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' or new.next_due_date is distinct from old.next_due_date then
    new.day_of_month := extract(day from new.next_due_date)::int;
  end if;
  return new;
end;
$$;
