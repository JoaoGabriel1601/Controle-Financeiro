import { addMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction, Category, Account, Loan } from '../types';
import { toJsDate } from './format';
import { roundCents } from './money';

export interface MonthlySummary {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  const movement = transactions.reduce((acc, t) => {
    if (t.type === 'transfer') {
      // Sai da conta de origem, entra na conta de destino.
      if (t.accountId === account.id) return acc - t.amount;
      if (t.toAccountId === account.id) return acc + t.amount;
      return acc;
    }
    if (t.accountId !== account.id) return acc;
    return acc + (t.type === 'income' ? t.amount : -t.amount);
  }, 0);
  return account.balance + movement;
}

/**
 * Patrimônio: soma de **todas** as contas. A dívida do cartão (conta `credit`)
 * entra com saldo negativo, então já é abatida aqui.
 */
export function computeTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, a) => sum + computeAccountBalance(a, transactions), 0);
}

/**
 * Saldo disponível: só o dinheiro de fato (exclui cartões de crédito). Um gasto
 * no cartão não reduz o disponível — só o pagamento da fatura (transfer) reduz.
 */
export function computeAvailableBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + computeAccountBalance(a, transactions), 0);
}

/**
 * Saldo devedor dos empréstimos ativos (centavos): parcelas restantes × valor.
 * As parcelas já pagas viraram despesas e já reduziram o saldo da conta; aqui
 * fica a dívida ainda não lançada, que deve ser abatida do patrimônio.
 */
export function loansOutstanding(loans: Loan[]): number {
  return loans
    .filter((l) => l.status === 'active')
    .reduce(
      (sum, l) => sum + l.installmentAmount * Math.max(0, l.installmentsTotal - l.installmentsPaid),
      0,
    );
}

export function summarizeByMonth(
  transactions: Transaction[],
  monthsBack = 6,
  reference = new Date(),
): MonthlySummary[] {
  const months: MonthlySummary[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = addMonths(reference, -i);
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    const key = format(ref, 'yyyy-MM');

    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      const date = toJsDate(tx.date);
      if (!isWithinInterval(date, { start, end })) continue;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }

    months.push({
      month: key,
      monthLabel: format(ref, 'MMM/yy', { locale: ptBR }),
      income,
      expense,
      balance: income - expense,
    });
  }

  return months;
}

export function breakdownByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: 'income' | 'expense' = 'expense',
): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();

  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const cat = categories.find((c) => c.id === tx.categoryId);
    const key = tx.categoryId || 'uncategorized';
    const entry = map.get(key) ?? {
      categoryId: key,
      name: cat?.name ?? 'Sem categoria',
      color: cat?.color ?? '#94a3b8',
      total: 0,
      count: 0,
    };
    entry.total += tx.amount;
    entry.count += 1;
    map.set(key, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function rollingAverage(
  transactions: Transaction[],
  windowMonths: 3 | 6 | 12,
  type: 'income' | 'expense' = 'expense',
  reference = new Date(),
): number {
  const start = startOfMonth(addMonths(reference, -(windowMonths - 1)));
  const end = endOfMonth(reference);

  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const date = toJsDate(tx.date);
    if (!isWithinInterval(date, { start, end })) continue;
    total += tx.amount;
  }
  return roundCents(total / windowMonths);
}

export function totalForMonth(
  transactions: Transaction[],
  type: 'income' | 'expense',
  reference = new Date(),
): number {
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const date = toJsDate(tx.date);
    if (!isWithinInterval(date, { start, end })) continue;
    total += tx.amount;
  }
  return total;
}
