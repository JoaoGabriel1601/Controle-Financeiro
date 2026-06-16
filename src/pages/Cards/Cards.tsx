import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus, Pencil, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { DateField } from '../../components/ui/DateField';
import { CARD_BRANDS, INSTITUTIONS } from '../../utils/brands';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { accountService } from '../../services/account.service';
import { formatCurrency, formatDate, dateInputValue, parseDateInput } from '../../utils/format';
import {
  availableLimit,
  buildInvoices,
  cardDebt,
  competenciaLabel,
  currentCompetencia,
} from '../../utils/invoices';
import type { Account, AccountInput, Invoice, Transaction } from '../../types';
import styles from './Cards.module.css';

interface PayTarget {
  card: Account;
  invoice: Invoice;
}

export function CardsPage() {
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [cardModal, setCardModal] = useState<{ card: Account | null } | null>(null);
  const [deletingCard, setDeletingCard] = useState<Account | null>(null);
  const [removing, setRemoving] = useState(false);

  const requestDeleteCard = (card: Account) => {
    const linked = transactions.filter(
      (t) => t.accountId === card.id || t.toAccountId === card.id,
    ).length;
    if (linked > 0) {
      toast.error(
        `"${card.name}" tem ${linked} ${linked === 1 ? 'transação vinculada' : 'transações vinculadas'}. Remova-as antes de excluir.`,
      );
      return;
    }
    setDeletingCard(card);
  };

  const handleDeleteCard = async () => {
    if (!deletingCard) return;
    setRemoving(true);
    try {
      await accountService.remove(deletingCard.id);
      toast.success('Cartão removido');
      setDeletingCard(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  const cardModals = (
    <>
      {cardModal && (
        <CardModal
          card={cardModal.card}
          cashAccounts={cashAccounts}
          onClose={() => setCardModal(null)}
        />
      )}
      <ConfirmDialog
        open={!!deletingCard}
        title="Remover cartão"
        description={`Tem certeza que deseja remover "${deletingCard?.name}"?`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDeleteCard}
        onCancel={() => setDeletingCard(null)}
      />
    </>
  );

  if (creditCards.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Cartões</h1>
            <p className={styles.subtitle}>Faturas e limites dos seus cartões de crédito.</p>
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={() => setCardModal({ card: null })}>
            Novo cartão
          </Button>
        </header>
        <Card>
          <EmptyState
            icon={<CreditCard size={28} />}
            title="Nenhum cartão cadastrado"
            description="Cadastre um cartão de crédito para acompanhar faturas e limite."
            action={
              <Button leftIcon={<Plus size={16} />} onClick={() => setCardModal({ card: null })}>
                Cadastrar cartão
              </Button>
            }
          />
        </Card>

        {cardModals}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Cartões</h1>
          <p className={styles.subtitle}>Faturas e limites dos seus cartões de crédito.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCardModal({ card: null })}>
          Novo cartão
        </Button>
      </header>

      <div className={styles.grid}>
        {creditCards.map((card) => (
          <CardPanel
            key={card.id}
            card={card}
            transactions={transactions}
            onPay={(invoice) => setPayTarget({ card, invoice })}
            onEdit={() => setCardModal({ card })}
            onDelete={() => requestDeleteCard(card)}
          />
        ))}
      </div>

      {payTarget && (
        <PayInvoiceModal
          key={`${payTarget.card.id}:${payTarget.invoice.competencia}`}
          target={payTarget}
          cashAccounts={cashAccounts}
          onClose={() => setPayTarget(null)}
        />
      )}

      {cardModals}
    </div>
  );
}

interface CardPanelProps {
  card: Account;
  transactions: Transaction[];
  onPay: (invoice: Invoice) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CardPanel({ card, transactions, onPay, onEdit, onDelete }: CardPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const invoices = useMemo(() => buildInvoices(card, transactions), [card, transactions]);
  const currentComp = currentCompetencia(card);

  const current = invoices.find((i) => i.competencia === currentComp);
  const previous = invoices.filter((i) => i.competencia !== currentComp);

  const debt = cardDebt(card, transactions);
  const available = availableLimit(card, transactions);
  const limit = card.creditLimit ?? 0;
  const usedPct = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

  return (
    <Card className={styles.panel}>
      <div className={styles.panelHead}>
        {card.brand ? (
          <BrandLogo slug={card.brand} size={38} radius={10} />
        ) : (
          <span className={styles.panelIcon}>
            <CreditCard size={18} />
          </span>
        )}
        <div className={styles.panelTitle}>
          <strong>{card.name}</strong>
          <span className={styles.panelMeta}>
            {card.institution && <BrandLogo slug={card.institution} size={16} radius={4} />}
            {card.dueDay != null && <span>Vence dia {card.dueDay}</span>}
          </span>
        </div>
        <div className={styles.panelActions}>
          <button onClick={onEdit} aria-label="Editar cartão">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} aria-label="Remover cartão">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {limit > 0 && (
        <div className={styles.limitArea}>
          <div className={styles.limitBar}>
            <div className={styles.limitFill} style={{ width: `${usedPct}%` }} />
          </div>
          <div className={styles.limitMeta}>
            <span>
              Disponível <strong>{formatCurrency(available)}</strong>
            </span>
            <span>Limite {formatCurrency(limit)}</span>
          </div>
        </div>
      )}

      <div className={styles.currentInvoice}>
        <span className={styles.sectionLabel}>Fatura atual · {competenciaLabel(currentComp)}</span>
        <InvoiceBlock invoice={current} onPay={onPay} />
      </div>

      {previous.length > 0 && (
        <div className={styles.history}>
          <button className={styles.historyToggle} onClick={() => setShowHistory((v) => !v)}>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${showHistory ? styles.chevronOpen : ''}`}
            />
            Faturas anteriores ({previous.length})
          </button>
          {showHistory && (
            <div className={styles.historyList}>
              {previous.map((inv) => (
                <div key={inv.competencia} className={styles.historyItem}>
                  <div className={styles.historyInfo}>
                    <strong>{competenciaLabel(inv.competencia)}</strong>
                    <span>Venc. {formatDate(inv.dueDate)}</span>
                  </div>
                  <div className={styles.historyRight}>
                    <span className={styles.historyTotal}>{formatCurrency(inv.total)}</span>
                    {inv.paid ? (
                      <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                        Paga
                      </Badge>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => onPay(inv)}>
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface InvoiceBlockProps {
  invoice: Invoice | undefined;
  onPay: (invoice: Invoice) => void;
}

function InvoiceBlock({ invoice, onPay }: InvoiceBlockProps) {
  if (!invoice || invoice.items.length === 0) {
    return <p className={styles.empty}>Nenhum lançamento nesta fatura.</p>;
  }
  const remaining = invoice.total - invoice.paidAmount;
  return (
    <>
      <div className={styles.invoiceTotalRow}>
        <strong className={styles.invoiceTotal}>{formatCurrency(invoice.total)}</strong>
        {invoice.paid ? (
          <Badge tone="success" icon={<CheckCircle2 size={12} />}>
            Paga
          </Badge>
        ) : (
          <Button size="sm" onClick={() => onPay(invoice)} disabled={remaining <= 0}>
            Pagar fatura
          </Button>
        )}
      </div>
      <div className={styles.itemList}>
        {invoice.items.map((tx) => (
          <div key={tx.id} className={styles.item}>
            <div className={styles.itemBody}>
              <span>{tx.description}</span>
              <span className={styles.itemDate}>
                {formatDate(tx.date)}
                {tx.installmentTotal && tx.installmentTotal > 1 && (
                  <Badge tone="info" className={styles.installmentBadge}>
                    {tx.installmentNo}/{tx.installmentTotal}
                  </Badge>
                )}
              </span>
            </div>
            <span className={`${styles.itemAmount} ${tx.type === 'income' ? styles.credit : ''}`}>
              {tx.type === 'income' ? '− ' : ''}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

interface CardModalProps {
  /** Cartão sendo editado, ou null para cadastro. */
  card: Account | null;
  cashAccounts: Account[];
  onClose: () => void;
}

/** Cadastra ou edita um cartão de crédito (conta do tipo 'credit'). */
function CardModal({ card, cashAccounts, onClose }: CardModalProps) {
  const isEdit = !!card;
  const [name, setName] = useState(card?.name ?? '');
  const [creditLimit, setCreditLimit] = useState<number>(card?.creditLimit ?? 0);
  const [closingDay, setClosingDay] = useState(card?.closingDay != null ? String(card.closingDay) : '');
  const [dueDay, setDueDay] = useState(card?.dueDay != null ? String(card.dueDay) : '');
  const [brand, setBrand] = useState(card?.brand ?? '');
  const [institution, setInstitution] = useState(card?.institution ?? '');
  const [paymentAccountId, setPaymentAccountId] = useState(card?.paymentAccountId ?? '');
  // Saldo do cartão é guardado negativo (dívida); exibe o valor positivo.
  const [openingBalance, setOpeningBalance] = useState<number>(card ? -card.balance : 0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Informe o nome do cartão');
    const closing = Number(closingDay);
    const due = Number(dueDay);
    if (!closingDay || closing < 1 || closing > 31)
      return toast.error('Informe um dia de fechamento entre 1 e 31');
    if (!dueDay || due < 1 || due > 31)
      return toast.error('Informe um dia de vencimento entre 1 e 31');

    setSubmitting(true);
    try {
      const payload: AccountInput = {
        name: name.trim(),
        type: 'credit',
        currency: 'BRL',
        // Fatura em aberto inicial é dívida → saldo negativo.
        balance: -openingBalance,
        // Limite 0 = "sem limite definido".
        creditLimit: creditLimit > 0 ? creditLimit : null,
        closingDay: closing,
        dueDay: due,
        paymentAccountId: paymentAccountId || null,
        brand: brand || null,
        institution: institution || null,
      };
      if (isEdit) {
        await accountService.update(card.id, payload);
        toast.success('Cartão atualizado');
      } else {
        await accountService.create(payload);
        toast.success('Cartão cadastrado');
      }
      onClose();
    } catch {
      toast.error('Não foi possível salvar o cartão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Editar cartão' : 'Novo cartão'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className={styles.formRow}>
          <Select label="Bandeira" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Nenhuma</option>
            {CARD_BRANDS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </Select>
          <Select
            label="Banco / Fintech"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          >
            <option value="">Nenhum</option>
            {INSTITUTIONS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </Select>
        </div>
        <MoneyField label="Limite do cartão" value={creditLimit} onChange={setCreditLimit} />
        <div className={styles.formRow}>
          <Input
            type="number"
            min={1}
            max={31}
            label="Dia de fechamento"
            placeholder="Ex.: 28"
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
          />
          <Input
            type="number"
            min={1}
            max={31}
            label="Dia de vencimento"
            placeholder="Ex.: 5"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </div>
        <Select
          label="Conta que paga a fatura"
          value={paymentAccountId}
          onChange={(e) => setPaymentAccountId(e.target.value)}
        >
          <option value="">Selecione (opcional)...</option>
          {cashAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <MoneyField
          label={isEdit ? 'Saldo inicial da fatura' : 'Fatura em aberto inicial'}
          value={openingBalance}
          onChange={setOpeningBalance}
          hint="Saldo de partida do cartão; os gastos lançados nas transações somam a este valor."
        />
      </form>
    </Modal>
  );
}

interface PayInvoiceModalProps {
  target: PayTarget;
  cashAccounts: Account[];
  onClose: () => void;
}

function PayInvoiceModal({ target, cashAccounts, onClose }: PayInvoiceModalProps) {
  const { card, invoice } = target;
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  const [accountId, setAccountId] = useState(card.paymentAccountId ?? cashAccounts[0]?.id ?? '');
  const [amount, setAmount] = useState<number>(remaining);
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = amount;
    if (!accountId) return toast.error('Selecione a conta de origem');
    if (!cents || cents <= 0) return toast.error('Informe um valor maior que zero');

    setSubmitting(true);
    try {
      await transactionService.create({
        type: 'transfer',
        amount: cents,
        description: `Pagamento fatura ${competenciaLabel(invoice.competencia)} · ${card.name}`,
        categoryId: '',
        accountId,
        toAccountId: card.id,
        date: parseDateInput(date),
        paidCompetencia: invoice.competencia,
      });
      toast.success('Pagamento registrado');
      onClose();
    } catch {
      toast.error('Não foi possível registrar o pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pagar fatura · ${competenciaLabel(invoice.competencia)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={cashAccounts.length === 0}>
            Pagar
          </Button>
        </>
      }
    >
      {cashAccounts.length === 0 ? (
        <p className={styles.empty}>
          Cadastre uma conta de dinheiro em <Link to="/contas">Contas</Link> para poder pagar a
          fatura.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className={styles.formStack}>
          <p className={styles.payInfo}>
            Total da fatura: <strong>{formatCurrency(invoice.total)}</strong>
            {invoice.paidAmount > 0 && <> · já pago {formatCurrency(invoice.paidAmount)}</>}
          </p>
          <Select label="Pagar com" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Selecione...</option>
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <div className={styles.formRow}>
            <MoneyField label="Valor" value={amount} onChange={setAmount} />
            <DateField label="Data" value={date} onChange={setDate} />
          </div>
        </form>
      )}
    </Modal>
  );
}
