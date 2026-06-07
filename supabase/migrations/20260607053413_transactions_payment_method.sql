-- =====================================================================
-- Método de pagamento das despesas (PIX, débito, dinheiro, crédito, boleto)
--
-- Coluna nullable e sem default: só faz sentido para despesas. Transferências
-- (inclusive o pagamento de fatura) e receitas permanecem com NULL.
-- =====================================================================

alter table public.transactions
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('cash', 'debit', 'pix', 'credit', 'boleto'));

comment on column public.transactions.payment_method is
  'Como o gasto foi pago: cash/debit/pix/credit/boleto. NULL para transferências e receitas.';
