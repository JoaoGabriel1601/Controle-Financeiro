-- =====================================================================
-- Método de pagamento nas recorrências
--
-- A transação gerada por uma recorrência passa a herdar o payment_method
-- (PIX, débito, dinheiro, crédito, boleto). Coluna nullable — só faz sentido
-- em despesas; receitas ficam NULL. As duas funções do motor são recriadas
-- para copiar o método na inserção (mantendo a geração ao meio-dia UTC).
-- =====================================================================

alter table public.recurring_transactions
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('cash', 'debit', 'pix', 'credit', 'boleto'));

comment on column public.recurring_transactions.payment_method is
  'Método herdado pela transação gerada: cash/debit/pix/credit/boleto. NULL para receitas.';

-- Catch-up por-usuário (chamado pelo client ao abrir o app).
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
      insert into public.transactions (user_id, account_id, category_id, type, amount, description, date, payment_method)
      values (uid, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''),
              (due + interval '12 hours')::timestamptz, r.payment_method);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;

-- Versão para TODOS os usuários (job agendado).
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
      insert into public.transactions (user_id, account_id, category_id, type, amount, description, date, payment_method)
      values (r.user_id, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''),
              (due + interval '12 hours')::timestamptz, r.payment_method);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;

revoke execute on function public.process_due_recurring_transactions()      from anon, public;
revoke execute on function public.process_all_due_recurring_transactions()  from anon, authenticated, public;
