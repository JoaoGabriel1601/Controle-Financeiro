import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { addMonths } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  QrCode,
  CreditCard,
  Banknote,
  Wallet,
  Barcode,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { dateInputValue, formatCurrency, formatDate, parseDateInput, toJsDate } from '../../utils/format';
import { centsToReais, parseMoneyInput, reaisToCents } from '../../utils/money';
import type { PaymentMethod, Transaction, TransactionType } from '../../types';
import styles from './Transactions.module.css';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  debit: 'Débito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  credit: 'Crédito',
};

// Ordem e ícone de cada método no seletor. "credit" usa conta de cartão; os
// demais saem de uma conta de dinheiro.
const PAYMENT_METHODS: { value: PaymentMethod; icon: ReactNode }[] = [
  { value: 'pix', icon: <QrCode size={18} /> },
  { value: 'debit', icon: <CreditCard size={18} /> },
  { value: 'cash', icon: <Banknote size={18} /> },
  { value: 'credit', icon: <Wallet size={18} /> },
  { value: 'boleto', icon: <Barcode size={18} /> },
];

interface FormState {
  type: TransactionType;
  amount: string;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  date: string;
  installments: string;
  paymentMethod: PaymentMethod;
}

const emptyForm = (categoryId: string, accountId: string, toAccountId = ''): FormState => ({
  type: 'expense',
  amount: '',
  description: '',
  categoryId,
  accountId,
  toAccountId,
  date: dateInputValue(new Date()),
  installments: '1',
  paymentMethod: 'pix',
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
  const [filterMethod, setFilterMethod] = useState<'all' | PaymentMethod>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
      if (filterMethod !== 'all' && tx.paymentMethod !== filterMethod) return false;
      if (term && !tx.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [transactions, search, filterType, filterCategory, filterAccount, filterMethod]);

  const openNew = () => {
    setEditing(null);
    const firstExpense = categories.find((c) => c.type === 'expense');
    const firstCash = accounts.find((a) => a.type !== 'credit');
    setForm(emptyForm(firstExpense?.id ?? '', firstCash?.id ?? accounts[0]?.id ?? '', accounts[1]?.id ?? ''));
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      type: tx.type,
      amount: String(centsToReais(tx.amount)),
      description: tx.description,
      categoryId: tx.categoryId,
      accountId: tx.accountId,
      toAccountId: tx.toAccountId ?? '',
      date: dateInputValue(tx.date),
      installments: '1',
      paymentMethod: tx.paymentMethod ?? 'pix',
    });
    setModalOpen(true);
  };

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const isCreditPurchase = form.type === 'expense' && form.paymentMethod === 'credit';

  // Conjunto de contas válidas para o (tipo, método) atual.
  const poolFor = (type: TransactionType, method: PaymentMethod) =>
    type === 'expense' ? (method === 'credit' ? creditCards : cashAccounts) : accounts;
  // Mantém a conta selecionada coerente ao trocar tipo/método.
  const reconcileAccount = (type: TransactionType, method: PaymentMethod, currentId: string) => {
    const pool = poolFor(type, method);
    return pool.some((a) => a.id === currentId) ? currentId : (pool[0]?.id ?? '');
  };

  // Contas mostradas no seletor de conta.
  const accountOptions = poolFor(form.type, form.paymentMethod);

  // Parcelamento só faz sentido numa compra nova no crédito (conta = cartão).
  const canInstall = !editing && isCreditPurchase && selectedAccount?.type === 'credit';

  // Só despesas carregam método de pagamento.
  const effectiveMethod: PaymentMethod | null = form.type === 'expense' ? form.paymentMethod : null;

  const installmentPreview = (() => {
    if (!canInstall) return undefined;
    const n = Math.max(1, Math.min(60, Math.trunc(Number(form.installments)) || 1));
    const cents = reaisToCents(parseMoneyInput(form.amount));
    if (!cents || n <= 1) return undefined;
    return `${n}× de aprox. ${formatCurrency(Math.floor(cents / n))}`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = reaisToCents(parseMoneyInput(form.amount));
    const isTransfer = form.type === 'transfer';
    if (!amount || amount <= 0) return toast.error('Informe um valor maior que zero');
    if (!form.description.trim()) return toast.error('Informe uma descrição');
    if (isTransfer) {
      if (!form.accountId) return toast.error('Selecione a conta de origem');
      if (!form.toAccountId) return toast.error('Selecione a conta de destino');
      if (form.accountId === form.toAccountId)
        return toast.error('Origem e destino devem ser contas diferentes');
    } else {
      if (!form.categoryId) return toast.error('Selecione uma categoria');
      if (!form.accountId) return toast.error('Selecione uma conta');
    }

    const installments = canInstall
      ? Math.max(1, Math.min(60, Math.trunc(Number(form.installments)) || 1))
      : 1;

    setSubmitting(true);
    try {
      // Compra parcelada no cartão: materializa N transações, uma por mês,
      // compartilhando o mesmo purchase_group_id.
      if (installments > 1) {
        const groupId = crypto.randomUUID();
        const purchaseDate = parseDateInput(form.date);
        const per = Math.floor(amount / installments);
        const remainder = amount - per * installments;
        const description = form.description.trim();
        await transactionService.createMany(
          Array.from({ length: installments }, (_, i) => ({
            type: 'expense' as const,
            // O resto dos centavos vai na primeira parcela.
            amount: i === 0 ? per + remainder : per,
            description: `${description} (${i + 1}/${installments})`,
            categoryId: form.categoryId,
            accountId: form.accountId,
            date: addMonths(purchaseDate, i),
            paymentMethod: 'credit' as const,
            installmentNo: i + 1,
            installmentTotal: installments,
            purchaseGroupId: groupId,
          })),
        );
        toast.success(`Compra parcelada em ${installments}× registrada`);
        setModalOpen(false);
        return;
      }

      const base = {
        type: form.type,
        amount,
        description: form.description.trim(),
        categoryId: isTransfer ? '' : form.categoryId,
        accountId: form.accountId,
        date: parseDateInput(form.date),
        paymentMethod: effectiveMethod,
      };
      const payload = isTransfer ? { ...base, toAccountId: form.toAccountId } : base;
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

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

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

  const findCategory = (id: string) => categoryMap.get(id);
  const findAccount = (id: string) => accountMap.get(id);

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
          <Select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value as 'all' | PaymentMethod)}
          >
            <option value="all">Todos os métodos</option>
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
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
                  const isTransfer = tx.type === 'transfer';
                  const toAcc = isTransfer ? findAccount(tx.toAccountId ?? '') : undefined;
                  const amountClass = isTransfer
                    ? styles.transfer
                    : isIncome
                      ? styles.income
                      : styles.expense;
                  return (
                    <div key={tx.id} className={styles.item}>
                      <span
                        className={styles.itemIcon}
                        style={{ background: cat?.color ?? 'var(--bg-card-hover)' }}
                      >
                        {cat?.icon ?? (isTransfer ? '🔄' : isIncome ? '💰' : '💸')}
                      </span>
                      <div className={styles.itemBody}>
                        <strong>{tx.description}</strong>
                        <div className={styles.itemMeta}>
                          {isTransfer ? (
                            <>
                              <Badge tone="neutral">Transferência</Badge>
                              <span>{acc?.name ?? '—'} → {toAcc?.name ?? '—'}</span>
                            </>
                          ) : (
                            <>
                              <Badge tone="neutral">{cat?.name ?? 'Sem categoria'}</Badge>
                              <span>{acc?.name ?? '—'}</span>
                              {tx.paymentMethod && (
                                <Badge tone="primary">{METHOD_LABELS[tx.paymentMethod]}</Badge>
                              )}
                              {tx.installmentTotal && tx.installmentTotal > 1 && (
                                <Badge tone="info">
                                  {tx.installmentNo}/{tx.installmentTotal}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`${styles.itemAmount} ${amountClass}`}>
                        {isTransfer ? (
                          <ArrowLeftRight size={14} />
                        ) : isIncome ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
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
        <form onSubmit={handleSubmit} className={styles.formStack}>
          <div className={styles.typeSwitch}>
            {(['expense', 'income', 'transfer'] as const).map((type) => {
              const toneClass =
                type === 'income' ? styles.income : type === 'transfer' ? styles.transfer : styles.expense;
              const label =
                type === 'income' ? 'Receita' : type === 'transfer' ? 'Transferência' : 'Despesa';
              const icon =
                type === 'income' ? (
                  <ArrowDownLeft size={16} />
                ) : type === 'transfer' ? (
                  <ArrowLeftRight size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                );
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      type,
                      accountId: reconcileAccount(type, form.paymentMethod, form.accountId),
                      categoryId:
                        type === 'transfer'
                          ? form.categoryId
                          : categories.find((c) => c.type === type)?.id ?? form.categoryId,
                    })
                  }
                  className={`${styles.typeBtn} ${form.type === type ? styles.typeBtnActive : ''} ${toneClass}`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <Input
            label="Descrição"
            placeholder="Ex.: Mercado da semana"
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
            <Input
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {form.type !== 'transfer' && (
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
          )}

          {form.type === 'expense' && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Método de pagamento</span>
              <div className={styles.methodGrid}>
                {PAYMENT_METHODS.map(({ value, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        paymentMethod: value,
                        accountId: reconcileAccount(form.type, value, form.accountId),
                        installments: value === 'credit' ? form.installments : '1',
                      })
                    }
                    className={`${styles.methodBtn} ${form.paymentMethod === value ? styles.methodBtnActive : ''}`}
                  >
                    {icon}
                    <span>{METHOD_LABELS[value]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Select
            label={form.type === 'transfer' ? 'Conta de origem' : isCreditPurchase ? 'Cartão' : 'Conta'}
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            hint={
              isCreditPurchase && creditCards.length === 0
                ? 'Nenhum cartão cadastrado — cadastre um em Cartões.'
                : undefined
            }
          >
            <option value="">Selecione...</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          {form.type === 'transfer' && (
            <Select
              label="Conta de destino"
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}

          {canInstall && (
            <Input
              type="number"
              min={1}
              max={60}
              label="Parcelas"
              value={form.installments}
              onChange={(e) => setForm({ ...form, installments: e.target.value })}
              hint={installmentPreview ?? 'Compra à vista (1×) ou parcele no cartão.'}
            />
          )}
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
