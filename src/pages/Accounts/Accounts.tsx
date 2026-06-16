import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { accountService } from '../../services/account.service';
import { formatCurrency } from '../../utils/format';
import { computeAccountBalance, computeAvailableBalance } from '../../utils/stats';
import { INSTITUTIONS } from '../../utils/brands';
import type { Account, AccountInput, AccountType } from '../../types';
import styles from './Accounts.module.css';

// Cartões de crédito são geridos na aba "Cartões" — aqui só contas de dinheiro.
type CashAccountType = Exclude<AccountType, 'credit'>;

const TYPE_LABELS: Record<CashAccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  investment: 'Investimento',
};

const TYPE_ICONS: Record<CashAccountType, React.ReactNode> = {
  checking: <Wallet size={18} />,
  savings: <PiggyBank size={18} />,
  investment: <TrendingUp size={18} />,
};

interface FormState {
  name: string;
  type: CashAccountType;
  balanceCents: number;
  currency: string;
  institution: string;
}

const EMPTY: FormState = {
  name: '',
  type: 'checking',
  balanceCents: 0,
  currency: 'BRL',
  institution: '',
};

export function AccountsPage() {
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [removing, setRemoving] = useState(false);

  // Só contas de dinheiro entram aqui; cartões ficam na aba "Cartões".
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  const cashTotal = useMemo(
    () => computeAvailableBalance(accounts, transactions),
    [accounts, transactions],
  );

  const balanceMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, computeAccountBalance(a, transactions)])),
    [accounts, transactions],
  );

  const requestDelete = (account: Account) => {
    const linked = transactions.filter((t) => t.accountId === account.id).length;
    if (linked > 0) {
      toast.error(
        `"${account.name}" tem ${linked} ${linked === 1 ? 'transação vinculada' : 'transações vinculadas'}. Remova ou reatribua antes de excluir.`,
      );
      return;
    }
    setDeleting(account);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setForm({
      name: account.name,
      type: (account.type === 'credit' ? 'checking' : account.type) as CashAccountType,
      balanceCents: account.balance,
      currency: account.currency,
      institution: account.institution ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome da conta');

    setSubmitting(true);
    try {
      const payload: AccountInput = {
        name: form.name,
        type: form.type,
        currency: form.currency,
        balance: form.balanceCents,
        institution: form.institution || null,
      };
      if (editing) {
        await accountService.update(editing.id, payload);
        toast.success('Conta atualizada');
      } else {
        await accountService.create(payload);
        toast.success('Conta criada');
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
      await accountService.remove(deleting.id);
      toast.success('Conta removida');
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
          <h1 className={styles.title}>Contas</h1>
          <p className={styles.subtitle}>Gerencie suas contas e veja o saldo consolidado.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openNew}>
          Nova conta
        </Button>
      </header>

      <Card className={styles.summary}>
        <div className={styles.summaryRow}>
          <div>
            <span className={styles.summaryLabel}>Saldo em contas</span>
            <strong className={styles.summaryValue}>{formatCurrency(cashTotal)}</strong>
          </div>
          <span className={styles.summaryHint}>
            {cashAccounts.length} {cashAccounts.length === 1 ? 'conta' : 'contas'}
          </span>
        </div>
      </Card>

      {cashAccounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={28} />}
            title="Nenhuma conta cadastrada"
            description="Cadastre suas contas bancárias e investimentos para acompanhar saldos. Cartões de crédito ficam na aba Cartões."
            action={
              <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                Nova conta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {cashAccounts.map((account) => {
            const type = account.type as CashAccountType;
            return (
              <div key={account.id} className={styles.card}>
                <div className={styles.cardHead}>
                  {account.institution ? (
                    <BrandLogo slug={account.institution} size={38} radius={10} />
                  ) : (
                    <span className={styles.cardIcon}>{TYPE_ICONS[type]}</span>
                  )}
                  <div className={styles.cardActions}>
                    <button onClick={() => openEdit(account)} aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => requestDelete(account)} aria-label="Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.cardName}>{account.name}</div>
                <div className={styles.cardType}>{TYPE_LABELS[type]}</div>
                <div className={styles.cardBalance}>
                  {formatCurrency(balanceMap.get(account.id) ?? account.balance, account.currency)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar conta' : 'Nova conta'}
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
            label="Nome"
            placeholder="Ex.: Nubank"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as CashAccountType })}
          >
            {(Object.entries(TYPE_LABELS) as [CashAccountType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          <Select
            label="Banco / Fintech"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          >
            <option value="">Nenhum / outro</option>
            {INSTITUTIONS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </Select>

          <MoneyField
            label={editing ? 'Saldo inicial registrado' : 'Saldo inicial'}
            value={form.balanceCents}
            onChange={(cents) => setForm({ ...form, balanceCents: cents })}
            hint="O saldo final é calculado adicionando suas transações."
          />
          <Select
            label="Moeda"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="BRL">Real (BRL)</option>
            <option value="USD">Dólar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover conta"
        description={`Tem certeza que deseja remover "${deleting?.name}"?`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
