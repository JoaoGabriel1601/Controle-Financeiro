import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { accountService } from '../../services/account.service';
import { formatCurrency, formatDate, dateInputValue, parseDateInput } from '../../utils/format';
import { centsToReais, parseMoneyInput, reaisToCents } from '../../utils/money';
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
  const [newCardOpen, setNewCardOpen] = useState(false);

  if (creditCards.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Cartões</h1>
            <p className={styles.subtitle}>Faturas e limites dos seus cartões de crédito.</p>
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={() => setNewCardOpen(true)}>
            Novo cartão
          </Button>
        </header>
        <Card>
          <EmptyState
            icon={<CreditCard size={28} />}
            title="Nenhum cartão cadastrado"
            description="Cadastre um cartão de crédito para acompanhar faturas e limite."
            action={
              <Button leftIcon={<Plus size={16} />} onClick={() => setNewCardOpen(true)}>
                Cadastrar cartão
              </Button>
            }
          />
        </Card>

        {newCardOpen && (
          <NewCardModal cashAccounts={cashAccounts} onClose={() => setNewCardOpen(false)} />
        )}
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
        <Button leftIcon={<Plus size={16} />} onClick={() => setNewCardOpen(true)}>
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

      {newCardOpen && (
        <NewCardModal cashAccounts={cashAccounts} onClose={() => setNewCardOpen(false)} />
      )}
    </div>
  );
}

interface CardPanelProps {
  card: Account;
  transactions: Transaction[];
  onPay: (invoice: Invoice) => void;
}

function CardPanel({ card, transactions, onPay }: CardPanelProps) {
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
        <span className={styles.panelIcon}>
          <CreditCard size={18} />
        </span>
        <div className={styles.panelTitle}>
          <strong>{card.name}</strong>
          {card.dueDay != null && <span>Vence dia {card.dueDay}</span>}
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

interface NewCardModalProps {
  cashAccounts: Account[];
  onClose: () => void;
}

/** Cadastro de cartão de crédito: cria uma conta do tipo 'credit'. */
function NewCardModal({ cashAccounts, onClose }: NewCardModalProps) {
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
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
      const limitParsed = parseMoneyInput(creditLimit);
      const openingParsed = parseMoneyInput(openingBalance);
      const openingCents = Number.isNaN(openingParsed) ? 0 : reaisToCents(openingParsed);
      const payload: AccountInput = {
        name: name.trim(),
        type: 'credit',
        currency: 'BRL',
        // Fatura em aberto inicial é dívida → saldo negativo.
        balance: -openingCents,
        creditLimit: !Number.isNaN(limitParsed) ? reaisToCents(limitParsed) : null,
        closingDay: closing,
        dueDay: due,
        paymentAccountId: paymentAccountId || null,
      };
      await accountService.create(payload);
      toast.success('Cartão cadastrado');
      onClose();
    } catch {
      toast.error('Não foi possível cadastrar o cartão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo cartão"
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
        <Input
          type="text"
          inputMode="decimal"
          label="Limite do cartão"
          placeholder="0,00"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
        />
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
        <Input
          type="text"
          inputMode="decimal"
          label="Fatura em aberto inicial"
          placeholder="0,00"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          hint="Deixe 0 se vai lançar os gastos do cartão pelas transações."
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
  const [amount, setAmount] = useState(String(centsToReais(remaining)));
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = reaisToCents(parseMoneyInput(amount));
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
            <Input
              label="Valor"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
