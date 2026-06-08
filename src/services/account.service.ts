import { supabase } from './supabase';
import type { Account, AccountInput } from '../types';

const TABLE = 'accounts';
// Alias das colunas snake_case -> camelCase para casar com os tipos do app.
const SELECT =
  'id, name, type, balance, currency, createdAt:created_at, institution, brand, creditLimit:credit_limit, closingDay:closing_day, dueDay:due_day, paymentAccountId:payment_account_id';

/** Mapeia o input (camelCase) para a linha do Postgres (snake_case). */
function toRow(data: Partial<AccountInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.type !== undefined) row.type = data.type;
  if (data.balance !== undefined) row.balance = data.balance;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.institution !== undefined) row.institution = data.institution || null;
  if (data.brand !== undefined) row.brand = data.brand || null;
  // Campos de cartão: só fazem sentido para type='credit'; demais ficam null.
  if (data.creditLimit !== undefined) row.credit_limit = data.creditLimit ?? null;
  if (data.closingDay !== undefined) row.closing_day = data.closingDay ?? null;
  if (data.dueDay !== undefined) row.due_day = data.dueDay ?? null;
  if (data.paymentAccountId !== undefined) row.payment_account_id = data.paymentAccountId || null;
  return row;
}

export const accountService = {
  subscribe(
    callback: (items: Account[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT)
        .order('created_at', { ascending: true });
      if (!active) return;
      if (error) {
        console.error('[accountService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as Account[]);
    };

    void load();
    const channel = supabase
      .channel('rt:accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: AccountInput) {
    const { error } = await supabase.from(TABLE).insert(toRow(data));
    if (error) throw error;
  },

  async update(id: string, data: Partial<AccountInput>) {
    const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
