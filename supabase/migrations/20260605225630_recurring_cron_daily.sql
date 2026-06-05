-- Job diário que gera os lançamentos recorrentes vencidos de TODOS os usuários,
-- independente de alguém abrir o app. Roda 06:00 UTC (~03:00 BRT).
create extension if not exists pg_cron;

select cron.schedule(
  'process-due-recurring-daily',
  '0 6 * * *',
  $$select public.process_all_due_recurring_transactions();$$
);
