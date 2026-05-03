import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useDataStore } from '../../stores/dataStore';
import { accountService } from '../../services/account.service';
import { formatCurrency } from '../../utils/format';
import type { Account, AccountInput, AccountType } from '../../types';
import styles from './Accounts.module.css';

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit: 'Cartão de crédito',
  investment: 'Investimento',
};

const TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  checking: <Wallet size={18} />,
  savings: <PiggyBank size={18} />,
  credit: <CreditCard size={18} />,
  investment: <TrendingUp size={18} />,
};

const EMPTY: AccountInput = {
  name: '',
  type: 'checking',
  balance: 0,
  currency: 'BRL',
};

export function AccountsPage() {
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const computedBalance = (account: Account) => {
    const txs = transactions.filter((t) => t.accountId === account.id);
    const movement = txs.reduce(
      (acc, t) => acc + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
      0,
    );
    return account.balance + movement;
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
      type: account.type,
      balance: account.balance,
      currency: account.currency,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome da conta');
    setSubmitting(true);
    try {
      if (editing) {
        await accountService.update(editing.id, form);
        toast.success('Conta atualizada');
      } else {
        await accountService.create(form);
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
            <span className={styles.summaryLabel}>Saldo total</span>
            <strong className={styles.summaryValue}>{formatCurrency(totalBalance)}</strong>
          </div>
          <span className={styles.summaryHint}>{accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}</span>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={28} />}
            title="Nenhuma conta cadastrada"
            description="Cadastre suas contas bancárias, cartões e investimentos para acompanhar saldos."
            action={
              <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                Nova conta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={styles.grid}>
          {accounts.map((account) => (
            <div key={account.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>{TYPE_ICONS[account.type]}</span>
                <div className={styles.cardActions}>
                  <button onClick={() => openEdit(account)} aria-label="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleting(account)} aria-label="Remover">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className={styles.cardName}>{account.name}</div>
              <div className={styles.cardType}>{TYPE_LABELS[account.type]}</div>
              <div className={styles.cardBalance}>{formatCurrency(computedBalance(account), account.currency)}</div>
            </div>
          ))}
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
          >
            <option value="checking">Conta corrente</option>
            <option value="savings">Poupança</option>
            <option value="credit">Cartão de crédito</option>
            <option value="investment">Investimento</option>
          </Select>
          <Input
            type="number"
            step="0.01"
            label={editing ? 'Saldo inicial registrado' : 'Saldo inicial'}
            placeholder="0,00"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: Number(e.target.value) || 0 })}
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
        description={`Tem certeza que deseja remover "${deleting?.name}"? As transações associadas continuarão existindo, mas perderão a referência.`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
