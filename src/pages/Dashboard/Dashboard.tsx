import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Landmark,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Repeat,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, parseDateInput } from '../../utils/format';
import {
  breakdownByCategory,
  computeAvailableBalance,
  computeTotalBalance,
  loansOutstanding,
  rollingAverage,
  summarizeByMonth,
  totalForMonth,
} from '../../utils/stats';
import { buildInvoices, competenciaLabel, currentCompetencia } from '../../utils/invoices';
import { IncomeExpenseLineChart } from '../../components/charts/IncomeExpenseLineChart';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { MonthlyBarChart } from '../../components/charts/MonthlyBarChart';
import styles from './Dashboard.module.css';

type MonthWindow = 3 | 6 | 12;

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const recurring = useDataStore((s) => s.recurring);
  const loans = useDataStore((s) => s.loans);
  const [monthsBack, setMonthsBack] = useState<MonthWindow>(6);

  const monthIncome = useMemo(() => totalForMonth(transactions, 'income'), [transactions]);
  const monthExpense = useMemo(() => totalForMonth(transactions, 'expense'), [transactions]);
  const monthBalance = monthIncome - monthExpense;

  const totalBalance = useMemo(
    () => computeTotalBalance(accounts, transactions),
    [accounts, transactions],
  );
  const availableBalance = useMemo(
    () => computeAvailableBalance(accounts, transactions),
    [accounts, transactions],
  );
  // Patrimônio = contas (cartão já entra negativo) − dívida restante de empréstimos.
  const netWorth = useMemo(
    () => totalBalance - loansOutstanding(loans),
    [totalBalance, loans],
  );

  const activeLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const cardInvoices = useMemo(
    () =>
      creditCards.map((card) => {
        const comp = currentCompetencia(card);
        const invoice = buildInvoices(card, transactions).find((i) => i.competencia === comp);
        return { card, competencia: comp, total: invoice?.total ?? 0 };
      }),
    [creditCards, transactions],
  );

  const monthlySummary = useMemo(() => summarizeByMonth(transactions, monthsBack), [transactions, monthsBack]);
  const expenseBreakdown = useMemo(
    () => breakdownByCategory(transactions, categories, 'expense').slice(0, 8),
    [transactions, categories],
  );
  const avgExpense = useMemo(() => rollingAverage(transactions, monthsBack, 'expense'), [transactions, monthsBack]);
  const avgIncome = useMemo(() => rollingAverage(transactions, monthsBack, 'income'), [transactions, monthsBack]);

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  const upcoming = useMemo(
    () =>
      recurring
        .filter((r) => r.isActive)
        .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
        .slice(0, 5),
    [recurring],
  );

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  if (transactions.length === 0 && accounts.length === 0 && categories.length === 0) {
    return (
      <div className={styles.page}>
        <Card>
          <EmptyState
            icon={<Wallet size={28} />}
            title="Vamos começar?"
            description="Cadastre suas contas e categorias para começar a acompanhar suas finanças."
            action={
              <Link to="/contas">
                <Button rightIcon={<ArrowRight size={16} />}>Criar conta</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>
            {greeting}, {user?.displayName?.split(' ')[0] ?? 'tudo bem?'} 👋
          </h1>
          <p className={styles.subtitle}>
            Aqui está um resumo das suas finanças neste mês.
          </p>
        </div>
      </header>

      <div className={styles.cards}>
        <SummaryCard
          icon={<Wallet size={20} />}
          label="Saldo disponível"
          value={formatCurrency(availableBalance)}
          tone="primary"
        />
        <SummaryCard
          icon={<Landmark size={20} />}
          label="Patrimônio"
          value={formatCurrency(netWorth)}
          tone={netWorth >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          icon={<ArrowDownLeft size={20} />}
          label="Receitas do mês"
          value={formatCurrency(monthIncome)}
          tone="success"
        />
        <SummaryCard
          icon={<ArrowUpRight size={20} />}
          label="Despesas do mês"
          value={formatCurrency(monthExpense)}
          tone="danger"
        />
        <SummaryCard
          icon={<PiggyBank size={20} />}
          label="Resultado do mês"
          value={formatCurrency(monthBalance)}
          tone={monthBalance >= 0 ? 'success' : 'danger'}
        />
      </div>

      {cardInvoices.length > 0 && (
        <Card
          title="Faturas dos cartões"
          subtitle="Fatura em aberto neste ciclo"
          action={
            <Link to="/cartoes">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                Ver cartões
              </Button>
            </Link>
          }
        >
          <div className={styles.recent}>
            {cardInvoices.map(({ card, competencia, total }) => (
              <div key={card.id} className={styles.recentItem}>
                <span className={styles.recentIcon} style={{ background: 'var(--primary-soft)' }}>
                  <CreditCard size={16} />
                </span>
                <div className={styles.recentBody}>
                  <strong>{card.name}</strong>
                  <span>Fatura {competenciaLabel(competencia)}</span>
                </div>
                <span className={styles.recentAmount}>{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeLoans.length > 0 && (
        <Card
          title="Empréstimos"
          subtitle="Parcelas pendentes"
          action={
            <Link to="/emprestimos">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                Ver empréstimos
              </Button>
            </Link>
          }
        >
          <div className={styles.recent}>
            {activeLoans.map((loan) => {
              const remaining = Math.max(0, loan.installmentsTotal - loan.installmentsPaid);
              return (
                <div key={loan.id} className={styles.recentItem}>
                  <span className={styles.recentIcon} style={{ background: 'var(--primary-soft)' }}>
                    <Landmark size={16} />
                  </span>
                  <div className={styles.recentBody}>
                    <strong>{loan.name}</strong>
                    <span>
                      {loan.installmentsPaid}/{loan.installmentsTotal} ·{' '}
                      {loan.nextDueDate
                        ? `próxima ${formatDate(parseDateInput(loan.nextDueDate))}`
                        : '—'}
                    </span>
                  </div>
                  <span className={styles.recentAmount}>
                    {formatCurrency(remaining * loan.installmentAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card
        title="Receita vs Despesa"
        subtitle={`Últimos ${monthsBack} meses`}
        action={
          <div className={styles.windowSwitch}>
            {[3, 6, 12].map((w) => (
              <button
                key={w}
                onClick={() => setMonthsBack(w as MonthWindow)}
                className={`${styles.windowBtn} ${monthsBack === w ? styles.windowBtnActive : ''}`}
              >
                {w}M
              </button>
            ))}
          </div>
        }
      >
        <IncomeExpenseLineChart data={monthlySummary} />
        <div className={styles.averages}>
          <div className={styles.averageItem}>
            <Badge tone="success" icon={<TrendingUp size={12} />}>
              Média de receita
            </Badge>
            <strong>{formatCurrency(avgIncome)}</strong>
          </div>
          <div className={styles.averageItem}>
            <Badge tone="danger" icon={<TrendingDown size={12} />}>
              Média de despesa
            </Badge>
            <strong>{formatCurrency(avgExpense)}</strong>
          </div>
        </div>
      </Card>

      <div className={styles.row}>
        <Card title="Distribuição de gastos" subtitle="Por categoria no período">
          {expenseBreakdown.length === 0 ? (
            <EmptyState title="Sem despesas no período" />
          ) : (
            <>
              <CategoryPieChart data={expenseBreakdown} />
              <div className={styles.topCategories}>
                {expenseBreakdown.slice(0, 4).map((cat) => (
                  <div key={cat.categoryId} className={styles.topCategory}>
                    <span className={styles.dot} style={{ background: cat.color }} />
                    <span className={styles.topName}>{cat.name}</span>
                    <strong>{formatCurrency(cat.total)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Comparativo mensal" subtitle="Receita e despesa por mês">
          <MonthlyBarChart data={monthlySummary} />
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card
          title="Próximos lançamentos"
          subtitle="Recorrências agendadas (ainda não lançadas)"
          action={
            <Link to="/recorrentes">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                Gerenciar
              </Button>
            </Link>
          }
        >
          <div className={styles.recent}>
            {upcoming.map((r) => {
              const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined;
              const isIncome = r.type === 'income';
              return (
                <div key={r.id} className={styles.recentItem}>
                  <span
                    className={styles.recentIcon}
                    style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}
                  >
                    {cat?.icon ?? <Repeat size={16} />}
                  </span>
                  <div className={styles.recentBody}>
                    <strong>{r.description}</strong>
                    <span>
                      {FREQ_LABEL[r.frequency]} · {formatDate(parseDateInput(r.nextDueDate))}
                    </span>
                  </div>
                  <span
                    className={`${styles.recentAmount} ${isIncome ? styles.incomeTxt : styles.expenseTxt}`}
                  >
                    {isIncome ? '+ ' : '− '}
                    {formatCurrency(r.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card
        title="Transações recentes"
        subtitle="Últimos 5 lançamentos"
        action={
          <Link to="/transacoes">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
              Ver todas
            </Button>
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="Nenhum lançamento ainda" />
        ) : (
          <div className={styles.recent}>
            {recent.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const acc = accountMap.get(tx.accountId);
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const toAcc = isTransfer ? accountMap.get(tx.toAccountId ?? '') : undefined;
              return (
                <div key={tx.id} className={styles.recentItem}>
                  <span className={styles.recentIcon} style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}>
                    {cat?.icon ?? (isTransfer ? '🔄' : '💸')}
                  </span>
                  <div className={styles.recentBody}>
                    <strong>{tx.description}</strong>
                    <span>
                      {isTransfer
                        ? `Transferência · ${acc?.name ?? '—'} → ${toAcc?.name ?? '—'}`
                        : `${cat?.name ?? 'Sem categoria'} · ${acc?.name ?? '—'}`}
                    </span>
                  </div>
                  <span
                    className={`${styles.recentAmount} ${
                      isTransfer ? '' : isIncome ? styles.incomeTxt : styles.expenseTxt
                    }`}
                  >
                    {isTransfer ? '' : isIncome ? '+ ' : '− '}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'danger';
}

function SummaryCard({ icon, label, value, tone }: SummaryCardProps) {
  return (
    <div className={`${styles.summary} ${styles[`tone_${tone}`]}`}>
      <span className={styles.summaryIcon}>{icon}</span>
      <span className={styles.summaryLabel}>{label}</span>
      <strong className={styles.summaryValue}>{value}</strong>
    </div>
  );
}
