import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Account, Invoice, Transaction } from '../types';
import { toJsDate, parseMonthKey } from './format';
import { computeAccountBalance } from './stats';

const COMPETENCIA_FMT = 'yyyy-MM';

/**
 * Faturas de cartão são **derivadas no client** a partir das transações (sem
 * tabela própria). Cada gasto no cartão é atribuído a um ciclo de fechamento
 * pela `closing_day`; o pagamento da fatura é um `transfer` para o cartão com
 * `paid_competencia` apontando o ciclo quitado.
 */

/** Data com o dia `day` no mês de `ref`, recuando para o último dia em meses curtos. */
function dayInMonth(ref: Date, day: number): Date {
  const last = endOfMonth(ref).getDate();
  const d = startOfMonth(ref);
  d.setDate(Math.min(day, last));
  return d;
}

/**
 * Competência (`YYYY-MM`) do ciclo de fatura a que uma data pertence.
 * Compras até o dia de fechamento entram na fatura do próprio mês; depois disso,
 * caem na do mês seguinte.
 */
export function competenciaForDate(date: Date | string, closingDay: number): string {
  const d = toJsDate(date);
  let cycle = startOfMonth(d);
  if (d.getDate() > closingDay) cycle = addMonths(cycle, 1);
  return format(cycle, COMPETENCIA_FMT);
}

/** Rótulo amigável de uma competência `YYYY-MM` (ex.: "jun/2026"). */
export function competenciaLabel(competencia: string): string {
  return format(parseMonthKey(competencia), 'MMM/yyyy', { locale: ptBR });
}

/** Competência da fatura atualmente em aberto do cartão. */
export function currentCompetencia(card: Account, reference: Date = new Date()): string {
  return competenciaForDate(reference, card.closingDay ?? 1);
}

/**
 * Dívida total em aberto do cartão (centavos): gastos lançados menos pagamentos.
 * Equivale ao saldo negativo da conta-cartão, derivado como as demais contas.
 */
export function cardDebt(card: Account, transactions: Transaction[]): number {
  return Math.max(0, -computeAccountBalance(card, transactions));
}

/** Limite ainda disponível no cartão (limite − dívida). */
export function availableLimit(card: Account, transactions: Transaction[]): number {
  return (card.creditLimit ?? 0) - cardDebt(card, transactions);
}

/**
 * Monta as faturas do cartão (atual + anteriores), ordenadas da mais recente
 * para a mais antiga. `paid` indica que o valor pago no ciclo cobre o total.
 */
export function buildInvoices(card: Account, transactions: Transaction[]): Invoice[] {
  const closingDay = card.closingDay ?? 1;
  const dueDay = card.dueDay ?? closingDay;

  const groups = new Map<string, Transaction[]>();
  const payments = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === 'transfer') {
      // Pagamento de fatura: transfer entrando no cartão com a competência quitada.
      if (tx.toAccountId === card.id && tx.paidCompetencia) {
        payments.set(tx.paidCompetencia, (payments.get(tx.paidCompetencia) ?? 0) + tx.amount);
      }
      continue;
    }
    if (tx.accountId !== card.id) continue;
    const comp = competenciaForDate(tx.date, closingDay);
    const list = groups.get(comp) ?? [];
    list.push(tx);
    groups.set(comp, list);
  }

  const competencias = new Set<string>([...groups.keys(), ...payments.keys()]);

  return [...competencias]
    .map<Invoice>((competencia) => {
      const items = (groups.get(competencia) ?? []).sort(
        (a, b) => toJsDate(b.date).getTime() - toJsDate(a.date).getTime(),
      );
      // Estornos (income no cartão) abatem a fatura.
      const total = items.reduce(
        (sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount),
        0,
      );
      const paidAmount = payments.get(competencia) ?? 0;
      const cycleMonth = parseMonthKey(competencia);
      const closingDate = dayInMonth(cycleMonth, closingDay);
      const dueMonth = dueDay > closingDay ? cycleMonth : addMonths(cycleMonth, 1);
      const dueDate = dayInMonth(dueMonth, dueDay);

      return {
        competencia,
        closingDate: format(closingDate, 'yyyy-MM-dd'),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        items,
        total,
        paid: total > 0 && paidAmount >= total,
        paidAmount,
      };
    })
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}
