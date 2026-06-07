import { supabase } from './supabase';
import type { PaymentMethod, Transaction, TransactionType } from '../types';

const TABLE = 'transactions';
const SELECT =
  'id, accountId:account_id, toAccountId:to_account_id, categoryId:category_id, type, amount, description, date, createdAt:created_at, paymentMethod:payment_method, installmentNo:installment_no, installmentTotal:installment_total, purchaseGroupId:purchase_group_id, paidCompetencia:paid_competencia, loanId:loan_id';

export type TransactionWrite = {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  date: Date | string;
  /** Método de pagamento (só para despesas). */
  paymentMethod?: PaymentMethod | null;
  /** Parcela (ex.: 3 em 3/12). */
  installmentNo?: number | null;
  installmentTotal?: number | null;
  /** Agrupa as N parcelas de uma mesma compra. */
  purchaseGroupId?: string | null;
  /** Competência `YYYY-MM` quitada por um pagamento de fatura. */
  paidCompetencia?: string | null;
  /** Empréstimo que originou a parcela (quando lançada manualmente). */
  loanId?: string | null;
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
  if (data.paymentMethod !== undefined) row.payment_method = data.paymentMethod || null;
  if (data.installmentNo !== undefined) row.installment_no = data.installmentNo ?? null;
  if (data.installmentTotal !== undefined) row.installment_total = data.installmentTotal ?? null;
  if (data.purchaseGroupId !== undefined) row.purchase_group_id = data.purchaseGroupId || null;
  if (data.paidCompetencia !== undefined) row.paid_competencia = data.paidCompetencia || null;
  if (data.loanId !== undefined) row.loan_id = data.loanId || null;
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

  /** Insere várias transações de uma vez (ex.: as N parcelas de uma compra). */
  async createMany(rows: TransactionWrite[]) {
    if (rows.length === 0) return;
    const { error } = await supabase.from(TABLE).insert(rows.map(toRow));
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
