-- =====================================================================
-- Cartões de crédito & compras parceladas
--
-- Re-versionamento idempotente: estas colunas JÁ foram aplicadas no remoto
-- (via MCP) numa migration cujo arquivo foi perdido. Este script recria a
-- definição de forma segura (ADD COLUMN IF NOT EXISTS) para o repo voltar a
-- refletir o servidor sem alterar nada quando re-executado.
--
--   accounts      → vira "cartão" quando type='credit': limite, dia de
--                   fechamento/vencimento e conta que paga a fatura.
--   transactions  → suporte a parcelas (purchase_group_id + N/total) e à
--                   marcação de competência quitada no pagamento da fatura.
-- =====================================================================

-- 1. Cartão de crédito: campos extras em accounts (só usados quando type='credit').
alter table public.accounts
  add column if not exists credit_limit       bigint
    check (credit_limit is null or credit_limit >= 0),
  add column if not exists closing_day        integer
    check (closing_day is null or (closing_day >= 1 and closing_day <= 31)),
  add column if not exists due_day            integer
    check (due_day is null or (due_day >= 1 and due_day <= 31)),
  add column if not exists payment_account_id uuid
    references public.accounts(id);

comment on column public.accounts.credit_limit       is 'Limite do cartão em centavos (apenas type=credit)';
comment on column public.accounts.closing_day        is 'Dia de fechamento da fatura, 1-31 (apenas type=credit)';
comment on column public.accounts.due_day            is 'Dia de vencimento da fatura, 1-31 (apenas type=credit)';
comment on column public.accounts.payment_account_id is 'Conta de dinheiro que paga a fatura por padrão';

-- 2. Parcelas e pagamento de fatura em transactions.
alter table public.transactions
  add column if not exists installment_no    integer
    check (installment_no is null or installment_no >= 1),
  add column if not exists installment_total integer
    check (installment_total is null or installment_total >= 1),
  add column if not exists purchase_group_id uuid,
  add column if not exists paid_competencia  text
    check (paid_competencia is null or paid_competencia ~ '^\d{4}-\d{2}$');

comment on column public.transactions.installment_no    is 'Número da parcela (ex.: 3 de 3/12)';
comment on column public.transactions.installment_total is 'Total de parcelas (ex.: 12 de 3/12)';
comment on column public.transactions.purchase_group_id is 'Agrupa as N parcelas de uma mesma compra';
comment on column public.transactions.paid_competencia  is 'No pagamento de fatura (transfer p/ cartão): competência YYYY-MM que foi quitada';
