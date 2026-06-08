# Supabase — schema e migrations

O backend deste app é o projeto Supabase **`xoeoasoovqigdiverxll`** ("APP Controle Financeiro",
região `sa-east-1`). Auth + Postgres (RLS por dono `auth.uid() = user_id`) + Realtime.

## Estado da versionagem

O projeto nasceu com as migrations aplicadas **direto no remoto** (via painel/MCP), então o
histórico completo (`supabase migration list`) vive no servidor, não aqui. Esta pasta começa a
versionar a partir das mudanças da **engine de recorrência**:

| Arquivo | O que faz |
| ------- | --------- |
| [`migrations/20260605225549_recurring_engine_hardening.sql`](migrations/20260605225549_recurring_engine_hardening.sql) | Anti-drift de fim de mês ancorado em `day_of_month`, anti-duplicação (`FOR UPDATE SKIP LOCKED`), dedupe de políticas RLS, hardening de `EXECUTE`. |
| [`migrations/20260605225630_recurring_cron_daily.sql`](migrations/20260605225630_recurring_cron_daily.sql) | `pg_cron` diário (06:00 UTC) gerando recorrências vencidas de **todos** os usuários. |
| [`migrations/20260605231047_recurring_fn_search_path_hardening.sql`](migrations/20260605231047_recurring_fn_search_path_hardening.sql) | Fixa `search_path` nas funções auxiliares (resolve o advisor `function_search_path_mutable`). |
| [`migrations/20260605234729_recurring_generate_at_noon_utc.sql`](migrations/20260605234729_recurring_generate_at_noon_utc.sql) | Gera os lançamentos ao **meio-dia UTC** para a data de calendário ficar correta em qualquer fuso (evita o "dia −1" no BRT). |
| [`migrations/20260607045500_credit_cards_and_installments.sql`](migrations/20260607045500_credit_cards_and_installments.sql) | **Cartões de crédito & parcelas.** Campos de cartão em `accounts` (`credit_limit`, `closing_day`, `due_day`, `payment_account_id`) e suporte a parcelas/pagamento de fatura em `transactions` (`installment_no`, `installment_total`, `purchase_group_id`, `paid_competencia`). Re-versionamento fiel de colunas já aplicadas no remoto (versão `20260607045500`; arquivo original foi perdido). |
| [`migrations/20260607053413_transactions_payment_method.sql`](migrations/20260607053413_transactions_payment_method.sql) | **Método de pagamento.** Coluna `payment_method` em `transactions` (`cash`/`debit`/`pix`/`credit`/`boleto`), nullable e sem default — só despesas preenchem; transferências e receitas ficam `NULL`. |
| [`migrations/20260607054102_loans_engine.sql`](migrations/20260607054102_loans_engine.sql) | **Empréstimos.** Tabela `loans` (parcelas fixas simples, sem juros) + coluna `loan_id` em `transactions`. Motor espelhando o de recorrentes: `process_due_loan_installments()` (por-usuário, catch-up no client) e `process_all_due_loan_installments()` (job `pg_cron` diário `process-due-loans-daily` 06:05 UTC). `day_of_month` é fixado no insert e nunca reescrito (âncora de fim de mês). RLS por dono + realtime. |
| [`migrations/20260608014558_recurring_payment_method.sql`](migrations/20260608014558_recurring_payment_method.sql) | **Método de pagamento nas recorrências.** Coluna `payment_method` em `recurring_transactions`; as funções do motor (`process_due/all_due_recurring_transactions`) recriadas para copiar o método na transação gerada. |
| [`reference/recurring_engine_baseline.sql`](reference/recurring_engine_baseline.sql) | Recriação **idempotente** da estrutura da tabela `recurring_transactions` (colunas, checks, FKs, índices, RLS, policies). Para disaster-recovery — **não** é uma migration. |

## Como sincronizar o baseline completo (recomendado)

Para trazer o schema inteiro (accounts, categories, transactions, budgets, triggers, etc.) para o
repo de forma fiel, use o CLI linkado ao projeto:

```bash
supabase login
supabase link --project-ref xoeoasoovqigdiverxll
supabase db pull          # gera uma migration com o schema atual do remoto
```

A partir daí, novas mudanças devem ser criadas como migration local e aplicadas com
`supabase db push` (em vez de editar o remoto direto).

## A engine de recorrência (resumo)

- `process_due_recurring_transactions()` — chamada pelo client ao abrir o app (apenas o usuário logado).
- `process_all_due_recurring_transactions()` — chamada pelo job `pg_cron` (todos os usuários).
- `next_recurring_date(due, freq, day_of_month)` — avança a data ancorando no dia-alvo, sem drift.
- Trigger `trg_recurring_day_of_month` — mantém `day_of_month` = dia do `next_due_date`.
- O saldo das contas é derivado no client (`utils/stats.ts`); não há trigger de saldo.
