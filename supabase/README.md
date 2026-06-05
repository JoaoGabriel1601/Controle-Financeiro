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
