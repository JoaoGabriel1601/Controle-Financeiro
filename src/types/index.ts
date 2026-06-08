export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';
/** Como o gasto foi pago. `credit` cai na fatura do cartão; os demais saem do saldo na hora. */
export type PaymentMethod = 'cash' | 'debit' | 'pix' | 'credit' | 'boleto';

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
  // ----- Apenas cartão de crédito (type === 'credit') -----
  /** Limite total do cartão em centavos. */
  creditLimit?: number | null;
  /** Dia de fechamento da fatura (1-31). */
  closingDay?: number | null;
  /** Dia de vencimento da fatura (1-31). */
  dueDay?: number | null;
  /** Conta de dinheiro que paga a fatura por padrão. */
  paymentAccountId?: string | null;
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
  /** Método de pagamento do gasto (Fase 2). */
  paymentMethod?: PaymentMethod | null;
  /** Número desta parcela (ex.: 3 em 3/12). */
  installmentNo?: number | null;
  /** Total de parcelas da compra (ex.: 12 em 3/12). */
  installmentTotal?: number | null;
  /** Agrupa as N parcelas de uma mesma compra. */
  purchaseGroupId?: string | null;
  /** No pagamento de fatura (transfer p/ cartão): competência `YYYY-MM` quitada. */
  paidCompetencia?: string | null;
  /** Empréstimo que originou a parcela, quando aplicável (Fase 3). */
  loanId?: string | null;
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
  /** Método de pagamento herdado pela transação gerada (só despesas). */
  paymentMethod?: PaymentMethod | null;
  dayOfMonth?: number | null;
  isActive: boolean;
  /** Próxima data de geração (ISO `yyyy-MM-dd`). */
  nextDueDate: string;
  /** Data ISO (timestamptz). */
  createdAt: string;
}

/**
 * Fatura de um cartão, derivada das transações no client (sem tabela própria).
 * Uma fatura agrupa os gastos de um ciclo de fechamento sob a competência `YYYY-MM`.
 */
export interface Invoice {
  /** Competência da fatura no formato `YYYY-MM`. */
  competencia: string;
  /** Data de fechamento do ciclo (ISO `yyyy-MM-dd`). */
  closingDate: string;
  /** Data de vencimento da fatura (ISO `yyyy-MM-dd`). */
  dueDate: string;
  /** Lançamentos do cartão que compõem a fatura. */
  items: Transaction[];
  /** Soma dos itens em centavos. */
  total: number;
  /** Se a fatura já foi quitada (há transfer com `paidCompetencia` correspondente). */
  paid: boolean;
  /** Valor já pago da fatura em centavos. */
  paidAmount: number;
}

export type LoanStatus = 'active' | 'settled';

/** Empréstimo com parcelas fixas simples (sem juros/amortização). */
export interface Loan {
  id: string;
  name: string;
  /** Credor (banco/financeira), opcional. */
  lender?: string | null;
  /** Valor total emprestado em centavos. */
  principalAmount: number;
  /** Valor de cada parcela em centavos. */
  installmentAmount: number;
  /** Quantidade total de parcelas. */
  installmentsTotal: number;
  /** Quantas parcelas já foram pagas/geradas. */
  installmentsPaid: number;
  /** Conta de dinheiro que paga as parcelas. */
  accountId: string;
  /** Categoria das parcelas geradas, opcional. */
  categoryId?: string | null;
  /** Dia do mês de vencimento da parcela (1-31). */
  dayOfMonth?: number | null;
  /** Próxima parcela a vencer (ISO `yyyy-MM-dd`); null quando quitado. */
  nextDueDate: string | null;
  status: LoanStatus;
  /** Data ISO (timestamptz). */
  createdAt: string;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt'>;
export type CategoryInput = Omit<Category, 'id'>;
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export type BudgetInput = Omit<Budget, 'id'>;
export type RecurringInput = Omit<RecurringTransaction, 'id' | 'createdAt' | 'dayOfMonth'>;
export type LoanInput = Omit<Loan, 'id' | 'createdAt' | 'installmentsPaid' | 'status'>;
