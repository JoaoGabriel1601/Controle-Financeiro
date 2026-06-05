-- =====================================================================
-- BASELINE (referência / disaster-recovery) — NÃO é uma migration.
-- Recriação idempotente da ESTRUTURA da tabela recurring_transactions.
-- A lógica da engine (funções, trigger, cron) está nas migrations:
--   20260605225549_recurring_engine_hardening.sql
--   20260605225630_recurring_cron_daily.sql
-- =====================================================================

create table if not exists public.recurring_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  account_id    uuid not null
                  references public.accounts(id) on delete cascade,
  category_id   uuid
                  references public.categories(id) on delete set null,
  type          text not null check (type in ('income', 'expense')),
  amount        bigint not null check (amount > 0),          -- centavos
  description   text default '',
  frequency     text not null default 'monthly'
                  check (frequency in ('weekly', 'monthly', 'yearly')),
  day_of_month  int check (day_of_month between 1 and 31),
  is_active     boolean default true,
  next_due_date date,
  created_at    timestamptz default now()
);

create index if not exists idx_recurring_user_id   on public.recurring_transactions (user_id);
create index if not exists idx_recurring_is_active on public.recurring_transactions (is_active);
create index if not exists idx_recurring_due       on public.recurring_transactions (is_active, next_due_date);

alter table public.recurring_transactions enable row level security;

drop policy if exists "Users can view own recurring"   on public.recurring_transactions;
drop policy if exists "Users can insert own recurring" on public.recurring_transactions;
drop policy if exists "Users can update own recurring" on public.recurring_transactions;
drop policy if exists "Users can delete own recurring" on public.recurring_transactions;

create policy "Users can view own recurring"
  on public.recurring_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own recurring"
  on public.recurring_transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring"
  on public.recurring_transactions for update using (auth.uid() = user_id);
create policy "Users can delete own recurring"
  on public.recurring_transactions for delete using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.recurring_transactions;
