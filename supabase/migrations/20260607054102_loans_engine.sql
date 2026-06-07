-- =====================================================================
-- Empréstimos com parcelas fixas simples (sem juros/amortização).
-- Espelha o motor de recorrentes: catch-up por-usuário + job diário.
-- day_of_month é fixado no insert (client) e NUNCA reescrito pelo engine,
-- preservando a âncora de fim de mês (dia 31 -> 28/fev -> 31/mar).
-- =====================================================================

create table if not exists public.loans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null,
  lender             text,
  principal_amount   bigint not null check (principal_amount > 0),
  installment_amount bigint not null check (installment_amount > 0),
  installments_total int not null check (installments_total >= 1),
  installments_paid  int not null default 0 check (installments_paid >= 0),
  account_id         uuid not null references public.accounts(id) on delete cascade,
  category_id        uuid references public.categories(id) on delete set null,
  day_of_month       int check (day_of_month between 1 and 31),
  next_due_date      date,
  status             text not null default 'active' check (status in ('active', 'settled')),
  created_at         timestamptz default now()
);

create index if not exists idx_loans_user_id on public.loans (user_id);
create index if not exists idx_loans_due on public.loans (status, next_due_date);

alter table public.loans enable row level security;

drop policy if exists "Users can view own loans"   on public.loans;
drop policy if exists "Users can insert own loans" on public.loans;
drop policy if exists "Users can update own loans" on public.loans;
drop policy if exists "Users can delete own loans" on public.loans;
create policy "Users can view own loans"   on public.loans for select using (auth.uid() = user_id);
create policy "Users can insert own loans" on public.loans for insert with check (auth.uid() = user_id);
create policy "Users can update own loans" on public.loans for update using (auth.uid() = user_id);
create policy "Users can delete own loans" on public.loans for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.loans;

-- Liga a parcela gerada ao empréstimo de origem.
alter table public.transactions
  add column if not exists loan_id uuid references public.loans(id) on delete set null;
comment on column public.transactions.loan_id is 'Empréstimo que originou esta parcela (se aplicável)';

-- Catch-up por-usuário (chamado pelo client ao abrir o app).
create or replace function public.process_due_loan_installments()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  r record;
  due date;
  paid int;
  generated integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  for r in
    select * from public.loans
     where user_id = uid
       and status = 'active'
       and next_due_date is not null
       and next_due_date <= current_date
       for update skip locked
  loop
    due := r.next_due_date;
    paid := r.installments_paid;
    while due <= current_date and paid < r.installments_total loop
      paid := paid + 1;
      insert into public.transactions
        (user_id, account_id, category_id, type, amount, description, date,
         loan_id, installment_no, installment_total)
      values
        (uid, r.account_id, r.category_id, 'expense', r.installment_amount,
         r.name || ' (' || paid || '/' || r.installments_total || ')',
         (due + interval '12 hours')::timestamptz, r.id, paid, r.installments_total);
      generated := generated + 1;
      due := public.next_recurring_date(due, 'monthly', r.day_of_month);
    end loop;
    if paid >= r.installments_total then
      update public.loans set installments_paid = paid, status = 'settled', next_due_date = null where id = r.id;
    else
      update public.loans set installments_paid = paid, next_due_date = due where id = r.id;
    end if;
  end loop;

  return generated;
end;
$$;

-- Versão para TODOS os usuários (job agendado).
create or replace function public.process_all_due_loan_installments()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  due date;
  paid int;
  generated integer := 0;
begin
  for r in
    select * from public.loans
     where status = 'active'
       and next_due_date is not null
       and next_due_date <= current_date
       for update skip locked
  loop
    due := r.next_due_date;
    paid := r.installments_paid;
    while due <= current_date and paid < r.installments_total loop
      paid := paid + 1;
      insert into public.transactions
        (user_id, account_id, category_id, type, amount, description, date,
         loan_id, installment_no, installment_total)
      values
        (r.user_id, r.account_id, r.category_id, 'expense', r.installment_amount,
         r.name || ' (' || paid || '/' || r.installments_total || ')',
         (due + interval '12 hours')::timestamptz, r.id, paid, r.installments_total);
      generated := generated + 1;
      due := public.next_recurring_date(due, 'monthly', r.day_of_month);
    end loop;
    if paid >= r.installments_total then
      update public.loans set installments_paid = paid, status = 'settled', next_due_date = null where id = r.id;
    else
      update public.loans set installments_paid = paid, next_due_date = due where id = r.id;
    end if;
  end loop;

  return generated;
end;
$$;

revoke execute on function public.process_due_loan_installments()     from anon, public;
revoke execute on function public.process_all_due_loan_installments() from anon, authenticated, public;

-- Job diário (06:05 UTC, logo após o de recorrentes).
create extension if not exists pg_cron;
select cron.schedule(
  'process-due-loans-daily',
  '5 6 * * *',
  $$select public.process_all_due_loan_installments();$$
);
