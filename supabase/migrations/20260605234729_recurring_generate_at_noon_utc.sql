-- Gera os lançamentos recorrentes ao MEIO-DIA UTC (em vez de meia-noite), para
-- que a data de calendário fique correta em qualquer fuso (-11..+11), evitando
-- o "dia -1" no client (BRT). Só muda o valor inserido em transactions.date.

create or replace function public.process_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  r record;
  due date;
  generated integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  for r in
    select * from public.recurring_transactions
     where user_id = uid
       and is_active = true
       and next_due_date is not null
       and next_due_date <= current_date
       for update skip locked
  loop
    due := r.next_due_date;
    while due <= current_date loop
      insert into public.transactions (user_id, account_id, category_id, type, amount, description, date)
      values (uid, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''),
              (due + interval '12 hours')::timestamptz);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;

create or replace function public.process_all_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  due date;
  generated integer := 0;
begin
  for r in
    select * from public.recurring_transactions
     where is_active = true
       and next_due_date is not null
       and next_due_date <= current_date
       for update skip locked
  loop
    due := r.next_due_date;
    while due <= current_date loop
      insert into public.transactions (user_id, account_id, category_id, type, amount, description, date)
      values (r.user_id, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''),
              (due + interval '12 hours')::timestamptz);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;
