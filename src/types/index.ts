export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';

/** Usuário autenticado, normalizado a partir do Supabase Auth. */
export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Saldo em centavos inteiros. */
  balance: number;
  currency: string;
  /** Data ISO (timestamptz). */
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface Transaction {
  id: string;
  accountId: string;
  /** Conta de destino — usado apenas quando `type === 'transfer'`. */
  toAccountId?: string | null;
  categoryId: string;
  type: TransactionType;
  /** Valor em centavos inteiros. */
  amount: number;
  description: string;
  /** Data ISO (timestamptz). */
  date: string;
  /** Data ISO (timestamptz). */
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  /** Limite em centavos inteiros. */
  limitAmount: number;
  month: number;
  year: number;
}

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: 'income' | 'expense';
  /** Valor em centavos inteiros. */
  amount: number;
  description: string;
  frequency: Frequency;
  dayOfMonth?: number | null;
  isActive: boolean;
  /** Próxima data de geração (ISO `yyyy-MM-dd`). */
  nextDueDate: string;
  /** Data ISO (timestamptz). */
  createdAt: string;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt'>;
export type CategoryInput = Omit<Category, 'id'>;
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type BudgetInput = Omit<Budget, 'id'>;
export type RecurringInput = Omit<RecurringTransaction, 'id' | 'createdAt' | 'dayOfMonth'>;
