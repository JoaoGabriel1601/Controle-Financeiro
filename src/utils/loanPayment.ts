import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { loanService } from '../services/loan.service';
import { transactionService } from '../services/transaction.service';
import { dateInputValue, parseDateInput } from './format';
import type { Loan } from '../types';

/** Próxima data mensal ancorada ao dia-alvo (sem drift de fim de mês). */
export function nextMonthly(due: Date, dayOfMonth: number): Date {
  const base = addMonths(startOfMonth(due), 1);
  const last = endOfMonth(base).getDate();
  base.setDate(Math.min(dayOfMonth, last));
  return base;
}

/**
 * Registra o pagamento da próxima parcela de um empréstimo: lança a transação
 * (com data de hoje) e avança o cronograma a partir da data ORIGINAL prevista,
 * preservando as datas seguintes. Retorna se o empréstimo ficou quitado.
 *
 * Reaproveitado tanto pela aba Empréstimos ("Pagar parcela") quanto pelo fluxo
 * de despesa em Lançamentos (natureza = empréstimo). O chamador deve garantir
 * que há parcela pendente; caso contrário lança erro.
 */
export async function payLoanInstallment(loan: Loan): Promise<{ settled: boolean }> {
  if (!loan.nextDueDate || loan.status !== 'active') {
    throw new Error('Empréstimo sem parcela pendente');
  }

  const no = loan.installmentsPaid + 1;
  const isLast = no >= loan.installmentsTotal;
  const due = parseDateInput(loan.nextDueDate);
  const nextDue = isLast
    ? null
    : dateInputValue(nextMonthly(due, loan.dayOfMonth ?? due.getDate()));

  await transactionService.create({
    type: 'expense',
    amount: loan.installmentAmount,
    description: `${loan.name} (${no}/${loan.installmentsTotal})`,
    categoryId: loan.categoryId ?? '',
    accountId: loan.accountId,
    date: new Date(),
    loanId: loan.id,
    installmentNo: no,
    installmentTotal: loan.installmentsTotal,
  });
  await loanService.registerProgress(loan.id, {
    installmentsPaid: no,
    nextDueDate: nextDue,
    status: isLast ? 'settled' : 'active',
  });

  return { settled: isLast };
}
