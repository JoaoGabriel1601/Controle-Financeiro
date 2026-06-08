import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { accountService } from '../../services/account.service';
import { formatCurrency } from '../../utils/format';
import { centsToReais, parseMoneyInput, reaisToCents } from '../../utils/money';
import { computeAccountBalance, computeAvailableBalance } from '../../utils/stats';
import { availableLimit, buildInvoices, currentCompetencia } from '../../utils/invoices';
import type { Account, AccountInput, AccountType, Transaction } from '../../types';
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

interface FormState {
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
  creditLimit: string;
  closingDay: string;
  dueDay: string;
  paymentAccountId: string;
}

const EMPTY: FormState = {
  name: '',
  type: 'checking',
  balance: '',
  currency: 'BRL',
  creditLimit: '',
  closingDay: '',
  dueDay: '',
  paymentAccountId: '',
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

  // Saldo somado só das contas de dinheiro (cartões têm seção/limite próprios).
  const cashTotal = useMemo(
    () => computeAvailableBalance(accounts, transactions),
    [accounts, transactions],
  );

  const balanceMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, computeAccountBalance(a, transactions)])),
    [accounts, transactions],
  );

  // Contas de dinheiro (exclui cartões) e cartões de crédito, em listas separadas.
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);
  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);

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
      type: account.type,
      // Cartão guarda a dívida como saldo negativo; exibe o valor positivo no form.
      balance: String(centsToReais(account.type === 'credit' ? -account.balance : account.balance)),
      currency: account.currency,
      creditLimit: account.creditLimit != null ? String(centsToReais(account.creditLimit)) : '',
      closingDay: account.closingDay != null ? String(account.closingDay) : '',
      dueDay: account.dueDay != null ? String(account.dueDay) : '',
      paymentAccountId: account.paymentAccountId ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome da conta');
    const isCredit = form.type === 'credit';
    if (isCredit) {
      const closing = Number(form.closingDay);
      const due = Number(form.dueDay);
      if (!form.closingDay || closing < 1 || closing > 31)
        return toast.error('Informe um dia de fechamento entre 1 e 31');
      if (!form.dueDay || due < 1 || due > 31)
        return toast.error('Informe um dia de vencimento entre 1 e 31');
    }

    setSubmitting(true);
    try {
      const parsed = parseMoneyInput(form.balance);
      const limitParsed = parseMoneyInput(form.creditLimit);
      const balanceCents = Number.isNaN(parsed) ? 0 : reaisToCents(parsed);
      const payload: AccountInput = {
        name: form.name,
        type: form.type,
        currency: form.currency,
        // Num cartão, o "saldo inicial" é fatura em aberto (dívida) → saldo negativo.
        balance: isCredit ? -balanceCents : balanceCents,
        // Campos de cartão: preenchidos só quando type='credit', senão zerados.
        creditLimit: isCredit && !Number.isNaN(limitParsed) ? reaisToCents(limitParsed) : null,
        closingDay: isCredit ? Number(form.closingDay) : null,
        dueDay: isCredit ? Number(form.dueDay) : null,
        paymentAccountId: isCredit ? form.paymentAccountId || null : null,
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

  const renderAccountCard = (account: Account) => (
    <div key={account.id} className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardIcon}>{TYPE_ICONS[account.type]}</span>
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
      <div className={styles.cardType}>{TYPE_LABELS[account.type]}</div>
      {account.type === 'credit' ? (
        <CreditCardFooter account={account} transactions={transactions} />
      ) : (
        <div className={styles.cardBalance}>
          {formatCurrency(balanceMap.get(account.id) ?? account.balance, account.currency)}
        </div>
      )}
    </div>
  );

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
            {creditCards.length > 0 &&
              ` · ${creditCards.length} ${creditCards.length === 1 ? 'cartão' : 'cartões'}`}
          </span>
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
        <>
          {cashAccounts.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Contas</h2>
              <div className={styles.grid}>{cashAccounts.map(renderAccountCard)}</div>
            </section>
          )}
          {creditCards.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Cartões de crédito</h2>
              <div className={styles.grid}>{creditCards.map(renderAccountCard)}</div>
            </section>
          )}
        </>
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
            onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
          >
            {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          {form.type === 'credit' && (
            <>
              <Input
                type="text"
                inputMode="decimal"
                label="Limite do cartão"
                placeholder="0,00"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
              <div className={styles.formRow}>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  label="Dia de fechamento"
                  placeholder="Ex.: 28"
                  value={form.closingDay}
                  onChange={(e) => setForm({ ...form, closingDay: e.target.value })}
                />
                <Input
                  type="number"
                  min={1}
                  max={31}
                  label="Dia de vencimento"
                  placeholder="Ex.: 5"
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                />
              </div>
              <Select
                label="Conta que paga a fatura"
                value={form.paymentAccountId}
                onChange={(e) => setForm({ ...form, paymentAccountId: e.target.value })}
              >
                <option value="">Selecione (opcional)...</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </>
          )}

          <Input
            type="text"
            inputMode="decimal"
            label={
              form.type === 'credit'
                ? editing
                  ? 'Saldo da fatura já existente'
                  : 'Fatura em aberto inicial'
                : editing
                  ? 'Saldo inicial registrado'
                  : 'Saldo inicial'
            }
            placeholder="0,00"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
            hint={
              form.type === 'credit'
                ? 'Deixe 0 se vai lançar os gastos do cartão pelas transações.'
                : 'O saldo final é calculado adicionando suas transações.'
            }
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

interface CreditCardFooterProps {
  account: Account;
  transactions: Transaction[];
}

/** Rodapé do card de cartão: fatura em aberto + limite disponível. */
function CreditCardFooter({ account, transactions }: CreditCardFooterProps) {
  const competencia = currentCompetencia(account);
  const invoice = useMemo(
    () => buildInvoices(account, transactions).find((i) => i.competencia === competencia),
    [account, transactions, competencia],
  );
  const available = availableLimit(account, transactions);

  return (
    <div className={styles.creditFooter}>
      <div>
        <span className={styles.creditLabel}>Fatura atual</span>
        <div className={styles.cardBalance}>{formatCurrency(invoice?.total ?? 0, account.currency)}</div>
      </div>
      {account.creditLimit != null && (
        <div>
          <span className={styles.creditLabel}>Limite disponível</span>
          <div className={styles.creditAvailable}>{formatCurrency(available, account.currency)}</div>
        </div>
      )}
    </div>
  );
}
