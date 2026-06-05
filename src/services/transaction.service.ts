import { supabase } from './supabase';
import type { Transaction, TransactionType } from '../types';

const TABLE = 'transactions';
const SELECT =
  'id, accountId:account_id, toAccountId:to_account_id, categoryId:category_id, type, amount, description, date, createdAt:created_at';

export type TransactionWrite = {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  date: Date | string;
};

/** Mapeia o input (camelCase) para a linha do Postgres (snake_case). */
function toRow(data: Partial<TransactionWrite>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.type !== undefined) row.type = data.type;
  if (data.amount !== undefined) row.amount = data.amount;
  if (data.description !== undefined) row.description = data.description;
  if (data.accountId !== undefined) row.account_id = data.accountId;
  // String vazia (ex.: transferência sem categoria) vira null para casar com o tipo uuid.
  if (data.categoryId !== undefined) row.category_id = data.categoryId || null;
  if (data.toAccountId !== undefined) row.to_account_id = data.toAccountId || null;
  if (data.date !== undefined) {
    row.date = (data.date instanceof Date ? data.date : new Date(data.date)).toISOString();
  }
  return row;
}

export const transactionService = {
  subscribe(
    callback: (items: Transaction[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT)
        .order('date', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('[transactionService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as Transaction[]);
    };

    void load();
    const channel = supabase
      .channel('rt:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: TransactionWrite) {
    const { error } = await supabase.from(TABLE).insert(toRow(data));
    if (error) throw error;
  },

  async update(id: string, data: Partial<TransactionWrite>) {
    const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
