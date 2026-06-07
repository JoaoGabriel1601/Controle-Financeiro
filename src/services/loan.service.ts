import { supabase } from './supabase';
import type { Loan, LoanInput, LoanStatus } from '../types';

const TABLE = 'loans';
const SELECT =
  'id, name, lender, principalAmount:principal_amount, installmentAmount:installment_amount, installmentsTotal:installments_total, installmentsPaid:installments_paid, accountId:account_id, categoryId:category_id, dayOfMonth:day_of_month, nextDueDate:next_due_date, status, createdAt:created_at';

/** Mapeia o input (camelCase) para a linha do Postgres (snake_case). */
function toRow(data: Partial<LoanInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.lender !== undefined) row.lender = data.lender || null;
  if (data.principalAmount !== undefined) row.principal_amount = data.principalAmount;
  if (data.installmentAmount !== undefined) row.installment_amount = data.installmentAmount;
  if (data.installmentsTotal !== undefined) row.installments_total = data.installmentsTotal;
  if (data.accountId !== undefined) row.account_id = data.accountId;
  if (data.categoryId !== undefined) row.category_id = data.categoryId || null;
  if (data.dayOfMonth !== undefined) row.day_of_month = data.dayOfMonth ?? null;
  if (data.nextDueDate !== undefined) row.next_due_date = data.nextDueDate;
  return row;
}

export const loanService = {
  subscribe(callback: (items: Loan[]) => void, onError?: (error: Error) => void): () => void {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('[loanService.subscribe]', error);
        onError?.(new Error(error.message));
        return;
      }
      callback((data ?? []) as Loan[]);
    };

    void load();
    const channel = supabase
      .channel('rt:loans')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => void load())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  },

  async create(data: LoanInput) {
    const { error } = await supabase.from(TABLE).insert(toRow(data));
    if (error) throw error;
  },

  async update(id: string, data: Partial<LoanInput>) {
    const { error } = await supabase.from(TABLE).update(toRow(data)).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Atualiza o progresso do empréstimo após uma parcela lançada manualmente
   * ("pagar agora"). Estes campos são geridos pelo engine no fluxo normal, por
   * isso ficam fora de `LoanInput`.
   */
  async registerProgress(
    id: string,
    patch: { installmentsPaid: number; nextDueDate: string | null; status: LoanStatus },
  ) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        installments_paid: patch.installmentsPaid,
        next_due_date: patch.nextDueDate,
        status: patch.status,
      })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Gera as parcelas de empréstimo vencidas (catch-up) no Postgres.
   * Retorna quantas parcelas foram lançadas.
   */
  async processDue(): Promise<number> {
    const { data, error } = await supabase.rpc('process_due_loan_installments');
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
