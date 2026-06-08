import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Repeat, Play, Pause, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { AccountOptions } from '../../components/ui/AccountOptions';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { recurringService } from '../../services/recurring.service';
import { dateInputValue, formatCurrency, formatDate, parseDateInput } from '../../utils/format';
import { centsToReais, parseMoneyInput, reaisToCents } from '../../utils/money';
import type { Frequency, RecurringTransaction, RecurringInput } from '../../types';
import styles from './Recurring.module.css';

const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

interface FormState {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  categoryId: string;
  accountId: string;
  frequency: Frequency;
  nextDueDate: string;
  isActive: boolean;
}

const emptyForm = (categoryId: string, accountId: string): FormState => ({
  type: 'expense',
  amount: '',
  description: '',
  categoryId,
  accountId,
  frequency: 'monthly',
  nextDueDate: dateInputValue(new Date()),
  isActive: true,
});

export function RecurringPage() {
  const recurring = useDataStore((s) => s.recurring);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('', ''));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [removing, setRemoving] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const categoriesForType = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type],
  );

  const openNew = () => {
    setEditing(null);
    const firstExpense = categories.find((c) => c.type === 'expense');
    setForm(emptyForm(firstExpense?.id ?? '', accounts[0]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (r: RecurringTransaction) => {
    setEditing(r);
    setForm({
      type: r.type,
      amount: String(centsToReais(r.amount)),
      description: r.description,
      categoryId: r.categoryId ?? '',
      accountId: r.accountId,
      frequency: r.frequency,
      nextDueDate: r.nextDueDate,
      isActive: r.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = reaisToCents(parseMoneyInput(form.amount));
    if (!amount || amount <= 0) return toast.error('Informe um valor maior que zero');
    if (!form.description.trim()) return toast.error('Informe uma descrição');
    if (!form.categoryId) return toast.error('Selecione uma categoria');
    if (!form.accountId) return toast.error('Selecione uma conta');
    if (!form.nextDueDate) return toast.error('Informe a data do próximo lançamento');

    setSubmitting(true);
    try {
      const payload: RecurringInput = {
        type: form.type,
        amount,
        description: form.description.trim(),
        categoryId: form.categoryId,
        accountId: form.accountId,
        frequency: form.frequency,
        nextDueDate: form.nextDueDate,
        isActive: form.isActive,
      };
      if (editing) {
        await recurringService.update(editing.id, payload);
        toast.success('Recorrência atualizada');
      } else {
        await recurringService.create(payload);
        toast.success('Recorrência criada');
      }
      setModalOpen(false);
      void generateDueNow();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  // Gera de imediato os lançamentos já vencidos (next_due_date <= hoje) para
  // refletirem no dashboard/gráficos na hora — sem esperar o próximo carregamento
  // do app ou o job diário. As inserções chegam pelas assinaturas em tempo real.
  const generateDueNow = async () => {
    try {
      const generated = await recurringService.processDue();
      if (generated > 0) {
        toast.success(
          `${generated} ${generated === 1 ? 'lançamento gerado' : 'lançamentos gerados'}`,
        );
      }
    } catch {
      // Silencioso: a recorrência já foi salva; a geração tenta de novo no
      // próximo carregamento do app ou no job diário.
    }
  };

  const toggleActive = async (r: RecurringTransaction) => {
    try {
      await recurringService.update(r.id, { isActive: !r.isActive });
      toast.success(r.isActive ? 'Recorrência pausada' : 'Recorrência reativada');
      if (!r.isActive) void generateDueNow();
    } catch {
      toast.error('Não foi possível atualizar');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await recurringService.remove(deleting.id);
      toast.success('Recorrência removida');
      setDeleting(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Transações recorrentes</h1>
          <p className={styles.subtitle}>
            Automatize lançamentos fixos — eles são gerados nas datas previstas ao abrir o app.
          </p>
        </div>
        <Button
          leftIcon={<Plus size={16} />}
          onClick={openNew}
          disabled={categories.length === 0 || accounts.length === 0}
        >
          Nova recorrência
        </Button>
      </header>

      {recurring.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Repeat size={28} />}
            title="Nenhuma recorrência ainda"
            description="Cadastre receitas e despesas fixas (salário, aluguel, assinaturas) para lançar automaticamente."
            action={
              categories.length > 0 && accounts.length > 0 ? (
                <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                  Nova recorrência
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {recurring.map((r) => {
            const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined;
            const acc = accountMap.get(r.accountId);
            const isIncome = r.type === 'income';
            return (
              <Card key={r.id} className={!r.isActive ? styles.paused : undefined}>
                <div className={styles.itemHead}>
                  <span className={styles.itemIcon} style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}>
                    {cat?.icon ?? (isIncome ? '💰' : '💸')}
                  </span>
                  <div className={styles.itemInfo}>
                    <strong>{r.description}</strong>
                    <span>
                      {cat?.name ?? 'Sem categoria'} · {acc?.name ?? '—'}
                    </span>
                  </div>
                  <div className={`${styles.amount} ${isIncome ? styles.income : styles.expense}`}>
                    {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    {formatCurrency(r.amount)}
                  </div>
                </div>

                <div className={styles.itemMeta}>
                  <Badge tone="neutral">{FREQUENCY_LABEL[r.frequency]}</Badge>
                  {r.isActive ? (
                    <span>Próximo: {formatDate(parseDateInput(r.nextDueDate))}</span>
                  ) : (
                    <Badge tone="warning">Pausada</Badge>
                  )}
                  <div className={styles.itemActions}>
                    <button onClick={() => toggleActive(r)} aria-label={r.isActive ? 'Pausar' : 'Reativar'}>
                      {r.isActive ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => openEdit(r)} aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(r)} aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar recorrência' : 'Nova recorrência'}
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
          <Input
            label="Descrição"
            placeholder="Ex.: Aluguel, Salário, Netflix"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            autoFocus
          />

          <div className={styles.formRow}>
            <Input
              label="Valor"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Select
              label="Frequência"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </Select>
          </div>

          <div className={styles.formRow}>
            <Select
              label="Tipo"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as 'income' | 'expense';
                setForm({
                  ...form,
                  type,
                  categoryId: categories.find((c) => c.type === type)?.id ?? '',
                });
              }}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </Select>
            <Input
              label="Próximo lançamento"
              type="date"
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
            />
          </div>

          <Select
            label="Categoria"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Selecione...</option>
            {categoriesForType.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Conta"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Selecione...</option>
            <AccountOptions accounts={accounts} />
          </Select>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span>Ativa (gera lançamentos automaticamente)</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover recorrência"
        description={`Remover "${deleting?.description}"? Os lançamentos já gerados não são afetados.`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
