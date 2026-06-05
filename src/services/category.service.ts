import { supabase } from './supabase';
import type { Category, CategoryInput } from '../types';

const TABLE = 'categories';
const SELECT = 'id, name, icon, color, type';

export const categoryService = {
  subscribe(
    callback: (items: Category[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT)
        .order('name', { ascending: true });
      if (!active) return;
      if (error) {
        console.error('[categoryService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as Category[]);
    };

    void load();
    const channel = supabase
      .channel('rt:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: CategoryInput) {
    const { error } = await supabase.from(TABLE).insert(data);
    if (error) throw error;
  },

  async update(id: string, data: Partial<CategoryInput>) {
    const { error } = await supabase.from(TABLE).update(data).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
