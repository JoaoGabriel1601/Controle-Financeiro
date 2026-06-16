import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { budgetService } from '../../services/budget.service';
import { formatCurrency, toJsDate } from '../../utils/format';
import type { Budget, BudgetInput } from '../../types';
import styles from './Budgets.module.css';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const currentDate = new Date();
const CURRENT_MONTH = currentDate.getMonth() + 1;
const CURRENT_YEAR = currentDate.getFullYear();

interface FormState {
  categoryId: string;
  limitAmountCents: number;
  month: number;
  year: number;
}

const emptyForm = (categoryId: string): FormState => ({
  categoryId,
  limitAmountCents: 0,
  month: CURRENT_MONTH,
  year: CURRENT_YEAR,
});

export function BudgetsPage() {
  const budgets = useDataStore((s) => s.budgets);
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [removing, setRemoving] = useState(false);
  const [period, setPeriod] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR });

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  const periodBudgets = useMemo(
    () => budgets.filter((b) => b.month === period.month && b.year === period.year),
    [budgets, period],
  );

  const consumedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const d = toJsDate(t.date);
      if (d.getMonth() + 1 !== period.month || d.getFullYear() !== period.year) continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return map;
  }, [transactions, period]);

  const consumed = (categoryId: string) => consumedMap.get(categoryId) ?? 0;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(expenseCategories[0]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setForm({
      categoryId: b.categoryId,
      limitAmountCents: b.limitAmount,
      month: b.month,
      year: b.year,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitAmount = form.limitAmountCents;
    if (!form.categoryId) return toast.error('Selecione uma categoria');
    if (!limitAmount || limitAmount <= 0) return toast.error('Informe um valor maior que zero');

    const isDuplicate = budgets.some(
      (b) =>
        b.categoryId === form.categoryId &&
        b.month === form.month &&
        b.year === form.year &&
        b.id !== editing?.id,
    );
    if (isDuplicate) return toast.error('Já existe um orçamento para esta categoria neste mês');

    setSubmitting(true);
    try {
      const payload: BudgetInput = {
        categoryId: form.categoryId,
        limitAmount,
        month: form.month,
        year: form.year,
      };
      if (editing) {
        await budgetService.update(editing.id, payload);
        toast.success('Orçamento atualizado');
      } else {
        await budgetService.create(payload);
        toast.success('Orçamento criado');
      }
      setModalOpen(false);
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await budgetService.remove(deleting.id);
      toast.success('Orçamento removido');
      setDeleting(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  const totals = useMemo(() => {
    const limit = periodBudgets.reduce((sum, b) => sum + b.limitAmount, 0);
    const used = periodBudgets.reduce((sum, b) => sum + (consumedMap.get(b.categoryId) ?? 0), 0);
    return { limit, used };
  }, [periodBudgets, consumedMap]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Orçamentos</h1>
          <p className={styles.subtitle}>Defina limites de gastos por categoria.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openNew} disabled={expenseCategories.length === 0}>
          Novo orçamento
        </Button>
      </header>

      <Card padded={false} className={styles.periodCard}>
        <div className={styles.periodRow}>
          <div className={styles.periodSelectors}>
            <Select
              value={period.month}
              onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              value={period.year}
              onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
          <div className={styles.periodSummary}>
            <div>
              <span>Total orçado</span>
              <strong>{formatCurrency(totals.limit)}</strong>
            </div>
            <div>
              <span>Total gasto</span>
              <strong className={totals.used > totals.limit ? styles.over : ''}>
                {formatCurrency(totals.used)}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {periodBudgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target size={28} />}
            title="Nenhum orçamento neste mês"
            description="Crie limites por categoria e acompanhe seu progresso ao longo do mês."
            action={
              expenseCategories.length > 0 ? (
                <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                  Novo orçamento
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {periodBudgets.map((b) => {
            const cat = categories.find((c) => c.id === b.categoryId);
            const used = consumed(b.categoryId);
            const pct = b.limitAmount > 0 ? Math.min((used / b.limitAmount) * 100, 100) : 0;
            const realPct = b.limitAmount > 0 ? (used / b.limitAmount) * 100 : 0;
            const tone = realPct >= 100 ? 'danger' : realPct >= 80 ? 'warning' : 'success';
            return (
              <Card key={b.id}>
                <div className={styles.budgetHead}>
                  <span className={styles.budgetIcon} style={{ background: cat?.color ?? '#94a3b8' }}>
                    {cat?.icon ?? '💰'}
                  </span>
                  <div className={styles.budgetInfo}>
                    <strong>{cat?.name ?? 'Categoria removida'}</strong>
                    <span>{formatCurrency(used)} de {formatCurrency(b.limitAmount)}</span>
                  </div>
                  <Badge tone={tone}>{realPct.toFixed(0)}%</Badge>
                  <div className={styles.budgetActions}>
                    <button onClick={() => openEdit(b)} aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(b)} aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.bar}>
                  <span className={`${styles.barFill} ${styles[`tone_${tone}`]}`} style={{ width: `${pct}%` }} />
                </div>
                {realPct >= 100 && (
                  <div className={styles.alert}>
                    <AlertTriangle size={14} /> Você ultrapassou o limite em {formatCurrency(used - b.limitAmount)}.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar orçamento' : 'Novo orçamento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={styles.formStack}>
          <Select
            label="Categoria"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Selecione...</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <MoneyField
            label="Limite mensal"
            value={form.limitAmountCents}
            onChange={(cents) => setForm({ ...form, limitAmountCents: cents })}
          />
          <div className={styles.formRow}>
            <Select
              label="Mês"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              label="Ano"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover orçamento"
        description="Tem certeza que deseja remover este orçamento?"
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
