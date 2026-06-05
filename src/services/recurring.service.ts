import { supabase } from './supabase';
import type { RecurringTransaction, RecurringInput } from '../types';

const TABLE = 'recurring_transactions';
const SELECT =
  'id, accountId:account_id, categoryId:category_id, type, amount, description, frequency, dayOfMonth:day_of_month, isActive:is_active, nextDueDate:next_due_date, createdAt:created_at';

/** Mapeia o input (camelCase) para a linha do Postgres (snake_case). */
function toRow(data: Partial<RecurringInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.accountId !== undefined) row.account_id = data.accountId;
  if (data.categoryId !== undefined) row.category_id = data.categoryId || null;
  if (data.type !== undefined) row.type = data.type;
  if (data.amount !== undefined) row.amount = data.amount;
  if (data.description !== undefined) row.description = data.description;
  if (data.frequency !== undefined) row.frequency = data.frequency;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.nextDueDate !== undefined) row.next_due_date = data.nextDueDate;
  return row;
}

export const recurringService = {
  subscribe(
    callback: (items: RecurringTransaction[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT)
        .order('next_due_date', { ascending: true });
      if (!active) return;
      if (error) {
        console.error('[recurringService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as RecurringTransaction[]);
    };

    void load();
    const channel = supabase
      .channel('rt:recurring_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: RecurringInput) {
    const { error } = await supabase.from(TABLE).insert(toRow(data));
    if (error) throw error;
  },

  async update(id: string, data: Partial<RecurringInput>) {
    const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Gera as transações das recorrências vencidas (catch-up) chamando a função
   * no Postgres. Retorna quantos lançamentos foram criados.
   */
  async processDue(): Promise<number> {
    const { data, error } = await supabase.rpc('process_due_recurring_transactions');
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
