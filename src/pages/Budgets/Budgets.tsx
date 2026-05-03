import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useDataStore } from '../../stores/dataStore';
import { budgetService } from '../../services/budget.service';
import { formatCurrency, toJsDate } from '../../utils/format';
import type { Budget, BudgetInput } from '../../types';
import styles from './Budgets.module.css';

const now = new Date();

const emptyForm = (categoryId: string): BudgetInput => ({
  categoryId,
  limitAmount: 0,
  month: now.getMonth() + 1,
  year: now.getFullYear(),
});

export function BudgetsPage() {
  const budgets = useDataStore((s) => s.budgets);
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetInput>(emptyForm(''));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [removing, setRemoving] = useState(false);
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  const periodBudgets = useMemo(
    () => budgets.filter((b) => b.month === period.month && b.year === period.year),
    [budgets, period],
  );

  const consumed = (categoryId: string) => {
    return transactions
      .filter((t) => {
        if (t.type !== 'expense' || t.categoryId !== categoryId) return false;
        const d = toJsDate(t.date);
        return d.getMonth() + 1 === period.month && d.getFullYear() === period.year;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(expenseCategories[0]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setForm({
      categoryId: b.categoryId,
      limitAmount: b.limitAmount,
      month: b.month,
      year: b.year,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) return toast.error('Selecione uma categoria');
    if (form.limitAmount <= 0) return toast.error('Informe um valor maior que zero');

    setSubmitting(true);
    try {
      if (editing) {
        await budgetService.update(editing.id, form);
        toast.success('Orçamento atualizado');
      } else {
        await budgetService.create(form);
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
    const used = periodBudgets.reduce((sum, b) => sum + consumed(b.categoryId), 0);
    return { limit, used };
  }, [periodBudgets, transactions]);

  const months = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];

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
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              value={period.year}
              onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <Input
            type="number"
            step="0.01"
            label="Limite mensal"
            placeholder="0,00"
            value={form.limitAmount || ''}
            onChange={(e) => setForm({ ...form, limitAmount: Number(e.target.value) || 0 })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Mês"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              label="Ano"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
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
