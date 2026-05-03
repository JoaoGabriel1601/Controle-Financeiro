import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/format';
import {
  breakdownByCategory,
  rollingAverage,
  summarizeByMonth,
  totalForMonth,
} from '../../utils/stats';
import { IncomeExpenseLineChart } from '../../components/charts/IncomeExpenseLineChart';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { MonthlyBarChart } from '../../components/charts/MonthlyBarChart';
import styles from './Dashboard.module.css';

type Window = 3 | 6 | 12;

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const [window, setWindow] = useState<Window>(6);

  const monthIncome = useMemo(() => totalForMonth(transactions, 'income'), [transactions]);
  const monthExpense = useMemo(() => totalForMonth(transactions, 'expense'), [transactions]);
  const monthBalance = monthIncome - monthExpense;

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => {
      const txs = transactions.filter((t) => t.accountId === a.id);
      const movement = txs.reduce(
        (acc, t) => acc + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
        0,
      );
      return sum + a.balance + movement;
    }, 0);
  }, [accounts, transactions]);

  const monthlySummary = useMemo(() => summarizeByMonth(transactions, window), [transactions, window]);
  const expenseBreakdown = useMemo(
    () => breakdownByCategory(transactions, categories, 'expense').slice(0, 8),
    [transactions, categories],
  );
  const avgExpense = useMemo(() => rollingAverage(transactions, window, 'expense'), [transactions, window]);
  const avgIncome = useMemo(() => rollingAverage(transactions, window, 'income'), [transactions, window]);

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

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
          label="Saldo total"
          value={formatCurrency(totalBalance)}
          tone="primary"
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

      <Card
        title="Receita vs Despesa"
        subtitle={`Últimos ${window} meses`}
        action={
          <div className={styles.windowSwitch}>
            {[3, 6, 12].map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w as Window)}
                className={`${styles.windowBtn} ${window === w ? styles.windowBtnActive : ''}`}
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
              const cat = categories.find((c) => c.id === tx.categoryId);
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} className={styles.recentItem}>
                  <span className={styles.recentIcon} style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}>
                    {cat?.icon ?? '💸'}
                  </span>
                  <div className={styles.recentBody}>
                    <strong>{tx.description}</strong>
                    <span>{cat?.name ?? 'Sem categoria'} · {acc?.name ?? '—'}</span>
                  </div>
                  <span className={`${styles.recentAmount} ${isIncome ? styles.incomeTxt : styles.expenseTxt}`}>
                    {isIncome ? '+' : '−'} {formatCurrency(tx.amount)}
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
