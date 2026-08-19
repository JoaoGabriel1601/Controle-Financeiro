import { useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  ArrowLeftRight,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { IconSelect, type IconSelectOption } from '../../components/ui/IconSelect';
import { Badge } from '../../components/ui/Badge';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_ORDER } from '../../components/ui/paymentMethodIcons';
import { METHOD_LABELS } from '../../utils/paymentMethods';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { formatCurrency, formatDate, toJsDate } from '../../utils/format';
import { LaunchModal } from './LaunchModal';
import { TransferModal } from './TransferModal';
import type { LaunchKind } from './launchForm';
import type { PaymentMethod, Transaction, TransactionType } from '../../types';
import styles from './Transactions.module.css';

export function TransactionsPage() {
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);

  // Estado dos modais de lançamento. `seq` só incrementa ao abrir e vira a `key`
  // do modal, forçando remontagem (form reiniciado) a cada abertura; `open`
  // controla visibilidade/animação e é desligado ao fechar sem trocar o conteúdo
  // durante a saída.
  const [launch, setLaunch] = useState<{
    kind: LaunchKind;
    editing: Transaction | null;
    open: boolean;
    seq: number;
  }>({ kind: 'expense', editing: null, open: false, seq: 0 });
  const [transfer, setTransfer] = useState<{
    editing: Transaction | null;
    open: boolean;
    seq: number;
  }>({ editing: null, open: false, seq: 0 });
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [removing, setRemoving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCard, setFilterCard] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | PaymentMethod>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
      if (filterCard !== 'all' && tx.accountId !== filterCard) return false;
      if (filterMethod !== 'all' && tx.paymentMethod !== filterMethod) return false;
      if (term && !tx.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [transactions, search, filterType, filterCategory, filterAccount, filterCard, filterMethod]);

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  const noBasics = categories.length === 0 || accounts.length === 0;

  const openNew = (kind: LaunchKind) =>
    setLaunch((p) => ({ kind, editing: null, open: true, seq: p.seq + 1 }));
  const openTransfer = () => setTransfer((p) => ({ editing: null, open: true, seq: p.seq + 1 }));
  const openEdit = (tx: Transaction) => {
    if (tx.type === 'transfer') {
      setTransfer((p) => ({ editing: tx, open: true, seq: p.seq + 1 }));
    } else {
      // `tx.type` já é 'income' | 'expense' aqui; capturado numa const para
      // preservar o narrowing dentro do closure do setState.
      const kind = tx.type;
      setLaunch((p) => ({ kind, editing: tx, open: true, seq: p.seq + 1 }));
    }
  };

  // Opções dos filtros com ícone: logo do banco (institution), bandeira do
  // cartão (brand) e ícone do método de pagamento.
  const accountFilterOptions = useMemo<IconSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as contas', icon: <Landmark size={18} /> },
      ...cashAccounts.map((a) => ({
        value: a.id,
        label: a.name,
        icon: <BrandLogo slug={a.institution} size={22} radius={6} />,
      })),
    ],
    [cashAccounts],
  );

  const cardFilterOptions = useMemo<IconSelectOption[]>(
    () => [
      { value: 'all', label: 'Todos os cartões', icon: <CreditCard size={18} /> },
      ...creditCards.map((a) => ({
        value: a.id,
        label: a.name,
        icon: <BrandLogo slug={a.brand} size={20} radius={4} />,
      })),
    ],
    [creditCards],
  );

  const methodFilterOptions = useMemo<IconSelectOption[]>(
    () => [
      { value: 'all', label: 'Todos os métodos', icon: <Wallet size={18} /> },
      ...PAYMENT_METHOD_ORDER.map((m) => ({
        value: m,
        label: METHOD_LABELS[m],
        icon: PAYMENT_METHOD_ICONS[m],
      })),
    ],
    [],
  );

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await transactionService.remove(deleting.id);
      toast.success('Lançamento removido');
      setDeleting(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

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

  const entryButtons = (
    <div className={styles.entryActions}>
      <Button
        variant="success"
        leftIcon={<ArrowDownLeft size={16} />}
        onClick={() => openNew('income')}
        disabled={noBasics}
      >
        Adicionar Receita
      </Button>
      <Button
        variant="danger"
        leftIcon={<ArrowUpRight size={16} />}
        onClick={() => openNew('expense')}
        disabled={noBasics}
      >
        Adicionar Despesa
      </Button>
      <Button
        variant="ghost"
        leftIcon={<ArrowLeftRight size={16} />}
        onClick={openTransfer}
        disabled={cashAccounts.length < 2}
      >
        Transferência
      </Button>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Lançamentos</h1>
          <p className={styles.subtitle}>Registre e acompanhe todas as suas movimentações.</p>
        </div>
        {entryButtons}
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
          <IconSelect
            value={filterAccount}
            onChange={(v) => {
              setFilterAccount(v);
              if (v !== 'all') setFilterCard('all');
            }}
            options={accountFilterOptions}
          />
          {creditCards.length > 0 && (
            <IconSelect
              value={filterCard}
              onChange={(v) => {
                setFilterCard(v);
                if (v !== 'all') setFilterAccount('all');
              }}
              options={cardFilterOptions}
            />
          )}
          <IconSelect
            value={filterMethod}
            onChange={(v) => setFilterMethod(v as 'all' | PaymentMethod)}
            options={methodFilterOptions}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight size={28} />}
            title={transactions.length === 0 ? 'Nenhum lançamento ainda' : 'Nenhum resultado'}
            description={
              transactions.length === 0
                ? 'Comece adicionando uma receita ou despesa.'
                : 'Tente ajustar os filtros para ver seus lançamentos.'
            }
            action={transactions.length === 0 && !noBasics ? entryButtons : undefined}
          />
        </Card>
      ) : (
        <div className={`${styles.groups} u-stagger`}>
          {grouped.map(([day, items]) => (
            <Card key={day} title={day} subtitle={`${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`}>
              <div className={`${styles.list} u-stagger`}>
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

      <LaunchModal
        key={`launch-${launch.seq}`}
        open={launch.open}
        kind={launch.kind}
        editing={launch.editing}
        onClose={() => setLaunch((p) => ({ ...p, open: false }))}
      />

      <TransferModal
        key={`transfer-${transfer.seq}`}
        open={transfer.open}
        editing={transfer.editing}
        onClose={() => setTransfer((p) => ({ ...p, open: false }))}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remover lançamento"
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
