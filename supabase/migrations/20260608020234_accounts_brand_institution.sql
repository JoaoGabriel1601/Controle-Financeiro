-- =====================================================================
-- Identidade visual das contas/cartões
--
-- brand       → bandeira do cartão (rede): visa/mastercard/elo/amex/hipercard.
-- institution → banco/fintech: nubank/itau/inter/...
-- Guardam um "slug" do registro de marcas do client; a logo é resolvida no
-- front (simple-icons quando existe + fallback de iniciais com a cor da marca).
-- =====================================================================

alter table public.accounts
  add column if not exists brand       text,
  add column if not exists institution text;

comment on column public.accounts.brand       is 'Bandeira do cartão (slug: visa/mastercard/elo/amex/hipercard). Só cartões.';
comment on column public.accounts.institution is 'Banco/fintech (slug: nubank/itau/inter/...). Qualquer conta.';
