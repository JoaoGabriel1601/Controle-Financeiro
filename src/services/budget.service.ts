import { supabase } from './supabase';
import type { Budget, BudgetInput } from '../types';

const TABLE = 'budgets';
const SELECT = 'id, categoryId:category_id, limitAmount:limit_amount, month, year';

/** Mapeia o input (camelCase) para a linha do Postgres (snake_case). */
function toRow(data: Partial<BudgetInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.categoryId !== undefined) row.category_id = data.categoryId;
  if (data.limitAmount !== undefined) row.limit_amount = data.limitAmount;
  if (data.month !== undefined) row.month = data.month;
  if (data.year !== undefined) row.year = data.year;
  return row;
}

export const budgetService = {
  subscribe(
    callback: (items: Budget[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from(TABLE).select(SELECT);
      if (!active) return;
      if (error) {
        console.error('[budgetService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as Budget[]);
    };

    void load();
    const channel = supabase
      .channel('rt:budgets')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: BudgetInput) {
    const { error } = await supabase.from(TABLE).insert(toRow(data));
    if (error) throw error;
  },

  async update(id: string, data: Partial<BudgetInput>) {
    const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
