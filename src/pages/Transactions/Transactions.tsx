import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowLeftRight, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { dateInputValue, formatCurrency, formatDate, parseDateInput, toJsDate } from '../../utils/format';
import type { Transaction, TransactionType } from '../../types';
import styles from './Transactions.module.css';

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  categoryId: string;
  accountId: string;
  date: string;
}

const emptyForm = (categoryId: string, accountId: string): FormState => ({
  type: 'expense',
  amount: '',
  description: '',
  categoryId,
  accountId,
  date: dateInputValue(new Date()),
});

export function TransactionsPage() {
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('', ''));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [removing, setRemoving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
      if (term && !tx.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [transactions, search, filterType, filterCategory, filterAccount]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? '', accounts[0]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description,
      categoryId: tx.categoryId,
      accountId: tx.accountId,
      date: dateInputValue(tx.date),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error('Informe um valor maior que zero');
    if (!form.categoryId) return toast.error('Selecione uma categoria');
    if (!form.accountId) return toast.error('Selecione uma conta');
    if (!form.description.trim()) return toast.error('Informe uma descrição');

    setSubmitting(true);
    try {
      const payload = {
        type: form.type,
        amount,
        description: form.description.trim(),
        categoryId: form.categoryId,
        accountId: form.accountId,
        date: parseDateInput(form.date),
      };
      if (editing) {
        await transactionService.update(editing.id, payload);
        toast.success('Transação atualizada');
      } else {
        await transactionService.create(payload);
        toast.success('Transação registrada');
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
      await transactionService.remove(deleting.id);
      toast.success('Transação removida');
      setDeleting(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  const categoriesForType = useMemo(
    () => categories.filter((c) => c.type === (form.type === 'transfer' ? 'expense' : form.type)),
    [categories, form.type],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((tx) => {
      const key = formatDate(tx.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const da = toJsDate(map.get(a[0])![0].date).getTime();
      const db = toJsDate(map.get(b[0])![0].date).getTime();
      return db - da;
    });
  }, [filtered]);

  const findCategory = (id: string) => categories.find((c) => c.id === id);
  const findAccount = (id: string) => accounts.find((a) => a.id === id);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Transações</h1>
          <p className={styles.subtitle}>Registre e acompanhe todas suas movimentações.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openNew} disabled={categories.length === 0 || accounts.length === 0}>
          Nova transação
        </Button>
      </header>

      <Card padded={false} className={styles.filters}>
        <div className={styles.filtersGrid}>
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}>
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </Select>
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="all">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight size={28} />}
            title={transactions.length === 0 ? 'Nenhuma transação ainda' : 'Nenhum resultado'}
            description={
              transactions.length === 0
                ? 'Comece registrando uma receita ou despesa.'
                : 'Tente ajustar os filtros para ver suas transações.'
            }
            action={
              transactions.length === 0 && categories.length > 0 && accounts.length > 0 ? (
                <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                  Nova transação
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className={styles.groups}>
          {grouped.map(([day, items]) => (
            <Card key={day} title={day} subtitle={`${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`}>
              <div className={styles.list}>
                {items.map((tx) => {
                  const cat = findCategory(tx.categoryId);
                  const acc = findAccount(tx.accountId);
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={tx.id} className={styles.item}>
                      <span
                        className={styles.itemIcon}
                        style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}
                      >
                        {cat?.icon ?? (isIncome ? '💰' : '💸')}
                      </span>
                      <div className={styles.itemBody}>
                        <strong>{tx.description}</strong>
                        <div className={styles.itemMeta}>
                          <Badge tone="neutral">{cat?.name ?? 'Sem categoria'}</Badge>
                          <span>{acc?.name ?? '—'}</span>
                        </div>
                      </div>
                      <div className={`${styles.itemAmount} ${isIncome ? styles.income : styles.expense}`}>
                        {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {formatCurrency(tx.amount)}
                      </div>
                      <div className={styles.itemActions}>
                        <button onClick={() => openEdit(tx)} aria-label="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleting(tx)} aria-label="Remover">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar transação' : 'Nova transação'}
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
          <div className={styles.typeSwitch}>
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    type,
                    categoryId:
                      categories.find((c) => c.type === type)?.id ?? form.categoryId,
                  })
                }
                className={`${styles.typeBtn} ${form.type === type ? styles.typeBtnActive : ''} ${
                  type === 'income' ? styles.income : styles.expense
                }`}
              >
                {type === 'income' ? 'Receita' : 'Despesa'}
              </button>
            ))}
          </div>

          <Input
            label="Descrição"
            placeholder="Ex.: Mercado da semana"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover transação"
        description={`Remover "${deleting?.description}"?`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
