import { supabase } from './supabase';
import type { Account, AccountInput } from '../types';

const TABLE = 'accounts';
// Alias das colunas snake_case -> camelCase para casar com os tipos do app.
const SELECT = 'id, name, type, balance, currency, createdAt:created_at';

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
    const { error } = await supabase.from(TABLE).insert({
      name: data.name,
      type: data.type,
      balance: data.balance,
      currency: data.currency,
    });
    if (error) throw error;
  },

  async update(id: string, data: Partial<AccountInput>) {
    const { error } = await supabase.from(TABLE).update(data).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
