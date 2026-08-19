import type { Account, Frequency, PaymentMethod } from '../../types';
import { dateInputValue } from '../../utils/format';

export type LaunchKind = 'income' | 'expense';
export type Recurrence = 'single' | 'recurring';
/**
 * Natureza da despesa:
 * - `card`: compra no cartão de crédito (vai para a fatura);
 * - `loan`: pagamento da próxima parcela de um empréstimo;
 * - `cash`: gasto à vista (débito/pix/dinheiro/boleto), sai do saldo na hora.
 */
export type ExpenseNature = 'card' | 'loan' | 'cash';

/** Formas de pagamento à vista (sem crédito, que é a natureza "cartão"). */
export const CASH_METHODS: PaymentMethod[] = ['pix', 'debit', 'cash', 'boleto'];

export interface LaunchFormState {
  recurrence: Recurrence;
  nature: ExpenseNature;
  amountCents: number;
  description: string;
  categoryId: string;
  accountId: string;
  date: string;
  installments: string;
  /** Forma de pagamento à vista (usada quando nature === 'cash'). */
  paymentMethod: PaymentMethod;
  loanId: string;
  // ----- Recorrência -----
  frequency: Frequency;
  nextDueDate: string;
  isActive: boolean;
}

export function emptyLaunchForm(overrides: Partial<LaunchFormState> = {}): LaunchFormState {
  const today = dateInputValue(new Date());
  return {
    recurrence: 'single',
    nature: 'cash',
    amountCents: 0,
    description: '',
    categoryId: '',
    accountId: '',
    date: today,
    installments: '1',
    paymentMethod: 'pix',
    loanId: '',
    frequency: 'monthly',
    nextDueDate: today,
    isActive: true,
    ...overrides,
  };
}

/**
 * Conjunto de contas válidas para o (tipo, natureza) atual: cartões só entram na
 * despesa com natureza "cartão"; receita e despesa à vista usam contas de dinheiro.
 */
export function poolFor(kind: LaunchKind, nature: ExpenseNature, accounts: Account[]): Account[] {
  if (kind === 'expense' && nature === 'card') return accounts.filter((a) => a.type === 'credit');
  return accounts.filter((a) => a.type !== 'credit');
}

/** Mantém a conta selecionada coerente ao trocar tipo/natureza. */
export function reconcileAccount(
  kind: LaunchKind,
  nature: ExpenseNature,
  currentId: string,
  accounts: Account[],
): string {
  const pool = poolFor(kind, nature, accounts);
  return pool.some((a) => a.id === currentId) ? currentId : (pool[0]?.id ?? '');
}

/** Método de pagamento efetivo: crédito na natureza "cartão"; senão a forma à vista. */
export function methodForNature(nature: ExpenseNature, cashMethod: PaymentMethod): PaymentMethod {
  return nature === 'card' ? 'credit' : cashMethod;
}
