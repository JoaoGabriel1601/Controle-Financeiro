-- =====================================================================
-- Recurring engine hardening
--   * anti-drift de fim de mês ancorado em day_of_month (itens 2 e 4)
--   * anti-duplicação com FOR UPDATE SKIP LOCKED (item 3)
--   * dedupe de políticas RLS (item 5)
--   * hardening de EXECUTE nas funções SECURITY DEFINER (item 7)
-- =====================================================================

-- 1. Helper: próxima data de recorrência ancorada ao dia-alvo (sem drift).
--    Para monthly/yearly usa day_of_month como "dia preferido", recuperando
--    o dia 29-31 após um mês curto em vez de escorregar permanentemente.
create or replace function public.next_recurring_date(due date, freq text, dom int)
returns date
language sql
immutable
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
    else -- monthly (default)
      (
        date_trunc('month', due) + interval '1 month'
        + (least(
             coalesce(dom, extract(day from due)::int),
             extract(day from (date_trunc('month', due) + interval '2 month - 1 day'))::int
           ) - 1) * interval '1 day'
      )::date
  end
$$;

-- 2. Trigger: mantém day_of_month sincronizado com o dia do next_due_date.
--    Só re-deriva quando a data realmente muda (ou no insert), preservando
--    o "dia 31" original ao editar outros campos de uma recorrência clampada.
create or replace function public.set_recurring_day_of_month()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.next_due_date is distinct from old.next_due_date then
    new.day_of_month := extract(day from new.next_due_date)::int;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recurring_day_of_month on public.recurring_transactions;
create trigger trg_recurring_day_of_month
  before insert or update on public.recurring_transactions
  for each row execute function public.set_recurring_day_of_month();

-- Backfill das linhas existentes (idempotente).
update public.recurring_transactions
   set day_of_month = extract(day from next_due_date)::int
 where next_due_date is not null and day_of_month is null;

-- 3. Função por-usuário (chamada pelo client ao abrir o app): catch-up
--    com anti-drift (helper) + anti-duplicação (FOR UPDATE SKIP LOCKED).
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
      values (uid, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''), due::timestamptz);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;

-- 4. Função para TODOS os usuários (usada pelo job agendado) — não usa auth.uid().
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
      values (r.user_id, r.account_id, r.category_id, r.type, r.amount, coalesce(r.description, ''), due::timestamptz);
      generated := generated + 1;
      due := public.next_recurring_date(due, r.frequency, r.day_of_month);
    end loop;
    update public.recurring_transactions set next_due_date = due where id = r.id;
  end loop;

  return generated;
end;
$$;

-- 5. Índice composto para a varredura de vencidas.
create index if not exists idx_recurring_due
  on public.recurring_transactions (is_active, next_due_date);

-- 6. RLS: remover políticas duplicadas, mantendo um conjunto por comando.
drop policy if exists "Users can view their own recurring_transactions"   on public.recurring_transactions;
drop policy if exists "Users can create their own recurring_transactions" on public.recurring_transactions;
drop policy if exists "Users can update their own recurring_transactions" on public.recurring_transactions;
drop policy if exists "Users can delete their own recurring_transactions" on public.recurring_transactions;
-- mantidas: "Users can view/insert/update/delete own recurring"

-- 7. Hardening: revogar EXECUTE de anon/public nas funções SECURITY DEFINER.
--    (triggers continuam funcionando — não dependem de EXECUTE do invocador.)
revoke execute on function public.process_due_recurring_transactions()      from anon, public;
revoke execute on function public.process_all_due_recurring_transactions()  from anon, authenticated, public;
revoke execute on function public.handle_new_user()                         from anon, authenticated, public;
