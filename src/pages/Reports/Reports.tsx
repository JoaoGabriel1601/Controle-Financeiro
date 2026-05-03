import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useDataStore } from '../../stores/dataStore';
import { breakdownByCategory, summarizeByMonth } from '../../utils/stats';
import { dateInputValue, formatCurrency, parseDateInput, toJsDate } from '../../utils/format';
import { exportTransactionsCSV, exportTransactionsPDF } from '../../utils/export';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { MonthlyBarChart } from '../../components/charts/MonthlyBarChart';
import styles from './Reports.module.css';

export function ReportsPage() {
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);

  const [start, setStart] = useState(dateInputValue(startOfMonth(new Date())));
  const [end, setEnd] = useState(dateInputValue(endOfMonth(new Date())));

  const { startDate, endDate, filtered } = useMemo(() => {
    const s = parseDateInput(start);
    const e = parseDateInput(end);
    const f = transactions.filter((tx) => isWithinInterval(toJsDate(tx.date), { start: s, end: e }));
    return { startDate: s, endDate: e, filtered: f };
  }, [transactions, start, end]);

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const monthly = useMemo(() => summarizeByMonth(filtered, 6), [filtered]);
  const expenseBreakdown = useMemo(() => breakdownByCategory(filtered, categories, 'expense'), [filtered, categories]);

  const handleCsv = () =>
    exportTransactionsCSV({ transactions: filtered, categories, accounts, start: startDate, end: endDate });
  const handlePdf = () =>
    exportTransactionsPDF({ transactions: filtered, categories, accounts, start: startDate, end: endDate });

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Relatórios</h1>
          <p className={styles.subtitle}>Visualize um resumo do período e exporte em PDF ou CSV.</p>
        </div>
      </header>

      <Card padded={false} className={styles.filtersCard}>
        <div className={styles.filters}>
          <Input
            type="date"
            label="Início"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            type="date"
            label="Fim"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <div className={styles.exports}>
            <Button variant="secondary" leftIcon={<FileSpreadsheet size={16} />} onClick={handleCsv}>
              Exportar CSV
            </Button>
            <Button leftIcon={<FileText size={16} />} onClick={handlePdf}>
              Exportar PDF
            </Button>
          </div>
        </div>
      </Card>

      <div className={styles.totals}>
        <Card>
          <span className={styles.totalLabel}>Receitas no período</span>
          <strong className={`${styles.totalValue} ${styles.income}`}>{formatCurrency(totalIncome)}</strong>
        </Card>
        <Card>
          <span className={styles.totalLabel}>Despesas no período</span>
          <strong className={`${styles.totalValue} ${styles.expense}`}>{formatCurrency(totalExpense)}</strong>
        </Card>
        <Card>
          <span className={styles.totalLabel}>Resultado</span>
          <strong
            className={`${styles.totalValue} ${totalIncome - totalExpense >= 0 ? styles.income : styles.expense}`}
          >
            {formatCurrency(totalIncome - totalExpense)}
          </strong>
        </Card>
        <Card>
          <span className={styles.totalLabel}>Lançamentos</span>
          <strong className={styles.totalValue}>{filtered.length}</strong>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Download size={26} />}
            title="Nenhum dado no período"
            description="Ajuste o intervalo de datas para visualizar transações."
          />
        </Card>
      ) : (
        <>
          <div className={styles.row}>
            <Card title="Comparativo mensal">
              <MonthlyBarChart data={monthly} />
            </Card>
            <Card title="Despesas por categoria">
              <CategoryPieChart data={expenseBreakdown} />
            </Card>
          </div>

          <Card title="Detalhamento por categoria" subtitle="Despesas no período">
            <div className={styles.breakdownList}>
              {expenseBreakdown.map((cat) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                return (
                  <div key={cat.categoryId} className={styles.breakdownRow}>
                    <span className={styles.breakdownDot} style={{ background: cat.color }} />
                    <div className={styles.breakdownInfo}>
                      <strong>{cat.name}</strong>
                      <span>
                        {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    </div>
                    <Badge tone="neutral">{pct.toFixed(1)}%</Badge>
                    <strong className={styles.breakdownValue}>{formatCurrency(cat.total)}</strong>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
