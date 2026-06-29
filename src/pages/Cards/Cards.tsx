import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Plus, Pencil, Trash2, ChevronDown, CheckCircle2, Wifi } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { IconSelect, type IconSelectOption } from '../../components/ui/IconSelect';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { DateField } from '../../components/ui/DateField';
import { CARD_BRANDS, INSTITUTIONS } from '../../utils/brands';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { useAuthStore } from '../../stores/authStore';
import { transactionService } from '../../services/transaction.service';
import { accountService } from '../../services/account.service';
import {
  formatCurrency,
  formatDate,
  dateInputValue,
  parseDateInput,
  parseMonthKey,
  toJsDate,
} from '../../utils/format';
import { findBrand } from '../../utils/brands';
import {
  buildInvoices,
  cardDebt,
  competenciaLabel,
  currentCompetencia,
} from '../../utils/invoices';
import type { Account, AccountInput, Category, Invoice, Transaction } from '../../types';
import styles from './Cards.module.css';

/** Hash estável de uma string em inteiro positivo. */
function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/** Últimos 4 dígitos decorativos (estáveis por cartão) para o visual do cartão. */
function decorativeLast4(id: string): string {
  return String(hashString(id) % 10000).padStart(4, '0');
}

/** "Válido até" decorativo (MM/AA estável por cartão). */
function decorativeValidThru(id: string): string {
  const h = hashString(`${id}:valid`);
  const month = String((h % 12) + 1).padStart(2, '0');
  const year = 28 + (h % 5);
  return `${month}/${year}`;
}

/** Mês da competência por extenso (ex.: "junho"). */
function invoiceMonthLabel(competencia: string): string {
  return format(parseMonthKey(competencia), 'MMMM', { locale: ptBR });
}

/** Data curta "dd MMM" (ex.: "28 jun"). */
function shortDayMonth(date: string): string {
  return format(toJsDate(date), 'dd MMM', { locale: ptBR });
}

// Opções dos seletores de bandeira e banco/fintech, com a logo ao lado do nome.
const BRAND_OPTIONS: IconSelectOption[] = [
  { value: '', label: 'Nenhuma' },
  ...CARD_BRANDS.map((b) => ({
    value: b.slug,
    label: b.label,
    icon: <BrandLogo slug={b.slug} size={22} radius={4} />,
  })),
];

const INSTITUTION_OPTIONS: IconSelectOption[] = [
  { value: '', label: 'Nenhum' },
  ...INSTITUTIONS.map((b) => ({
    value: b.slug,
    label: b.label,
    icon: <BrandLogo slug={b.slug} size={22} radius={6} />,
  })),
];

// Conta de dinheiro vira opção com a logo do banco (institution).
const cashAccountOption = (a: Account): IconSelectOption => ({
  value: a.id,
  label: a.name,
  icon: <BrandLogo slug={a.institution} size={22} radius={6} />,
});

interface PayTarget {
  card: Account;
  invoice: Invoice;
}

export function CardsPage() {
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const user = useAuthStore((s) => s.user);

  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  // Mapa de categorias para exibir o ícone/cor de cada lançamento na fatura.
  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  // Total em aberto somando a fatura atual de cada cartão (para o subtítulo).
  const openTotal = useMemo(
    () => creditCards.reduce((sum, card) => sum + cardDebt(card, transactions), 0),
    [creditCards, transactions],
  );

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
        <Card padded>
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
          <p className={styles.subtitle}>
            Fatura aberta · <strong>{formatCurrency(openTotal)}</strong>
          </p>
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
            categoryById={categoryById}
            holderName={user?.displayName ?? null}
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
  categoryById: Map<string, Category>;
  holderName: string | null;
  onPay: (invoice: Invoice) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CardPanel({
  card,
  transactions,
  categoryById,
  holderName,
  onPay,
  onEdit,
  onDelete,
}: CardPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const invoices = useMemo(() => buildInvoices(card, transactions), [card, transactions]);
  const currentComp = currentCompetencia(card);

  const current = invoices.find((i) => i.competencia === currentComp);
  const previous = invoices.filter((i) => i.competencia !== currentComp);

  const debt = cardDebt(card, transactions);
  const limit = card.creditLimit ?? 0;
  const usedPct = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

  const bankName = card.institution ? (findBrand(card.institution)?.label ?? card.name) : card.name;
  const remaining = current ? current.total - current.paidAmount : 0;

  return (
    <div className={styles.layout}>
      {/* Coluna esquerda: cartão visual + limite */}
      <div className={styles.leftCol}>
        <div className={styles.creditCard}>
          <div className={styles.ccGlow} aria-hidden />
          <div className={styles.ccTop}>
            <span className={styles.ccBank}>{bankName}</span>
            <span className={styles.ccChip} aria-hidden>
              <Wifi size={18} />
            </span>
          </div>

          <div className={styles.ccNumber}>
            <span>••••</span>
            <span>••••</span>
            <span>••••</span>
            <span className={styles.ccLast4}>{decorativeLast4(card.id)}</span>
          </div>

          <div className={styles.ccBottom}>
            <div className={styles.ccField}>
              <span className={styles.ccLabel}>Titular</span>
              <strong className={styles.ccValue}>
                {(holderName ?? 'Titular').toUpperCase()}
              </strong>
            </div>
            <div className={`${styles.ccField} ${styles.ccFieldRight}`}>
              <span className={styles.ccLabel}>Válido até</span>
              <strong className={styles.ccValue}>{decorativeValidThru(card.id)}</strong>
            </div>
            {card.brand && (
              <div className={styles.ccBrand}>
                <BrandLogo slug={card.brand} size={44} radius={6} />
              </div>
            )}
          </div>
        </div>

        {limit > 0 && (
          <Card padded className={styles.limitCard}>
            <div className={styles.limitTop}>
              <span className={styles.limitTitle}>Limite utilizado</span>
              <strong className={styles.limitPct}>{usedPct}%</strong>
            </div>
            <div className={styles.limitBar}>
              <div className={styles.limitFill} style={{ width: `${usedPct}%` }} />
            </div>
            <div className={styles.limitMeta}>
              <span>{formatCurrency(debt)} usados</span>
              <span>{formatCurrency(limit)} limite</span>
            </div>
          </Card>
        )}
      </div>

      {/* Coluna direita: fatura atual */}
      <Card padded className={styles.invoiceCard}>
        <div className={styles.invoiceHead}>
          <div className={styles.invoiceTitleArea}>
            <h3 className={styles.invoiceTitle}>Fatura de {invoiceMonthLabel(currentComp)}</h3>
            {current && (
              <span className={styles.invoiceCycle}>
                Fecha {shortDayMonth(current.closingDate)} · vence {shortDayMonth(current.dueDate)}
              </span>
            )}
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

        <div className={styles.invoiceTotalRow}>
          <strong className={styles.invoiceTotal}>{formatCurrency(current?.total ?? 0)}</strong>
          {current &&
            (current.paid ? (
              <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                Paga
              </Badge>
            ) : (
              <Button size="sm" onClick={() => onPay(current)} disabled={remaining <= 0}>
                Pagar fatura
              </Button>
            ))}
        </div>

        <InvoiceItems invoice={current} categoryById={categoryById} />

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
    </div>
  );
}

interface InvoiceItemsProps {
  invoice: Invoice | undefined;
  categoryById: Map<string, Category>;
}

function InvoiceItems({ invoice, categoryById }: InvoiceItemsProps) {
  if (!invoice || invoice.items.length === 0) {
    return <p className={styles.empty}>Nenhum lançamento nesta fatura.</p>;
  }
  return (
    <div className={styles.itemList}>
      {invoice.items.map((tx) => {
        const cat = categoryById.get(tx.categoryId);
        const isCredit = tx.type === 'income';
        return (
          <div key={tx.id} className={styles.item}>
            <span
              className={styles.itemIcon}
              style={cat ? { background: `${cat.color}22`, color: cat.color } : undefined}
            >
              {cat?.icon ?? (isCredit ? '💰' : '💸')}
            </span>
            <div className={styles.itemBody}>
              <span className={styles.itemName}>{tx.description}</span>
              <span className={styles.itemMeta}>
                {cat?.name ? `${cat.name} · ` : ''}
                {shortDayMonth(tx.date)}
                {tx.installmentTotal && tx.installmentTotal > 1 && (
                  <Badge tone="info" className={styles.installmentBadge}>
                    {tx.installmentNo}/{tx.installmentTotal}
                  </Badge>
                )}
              </span>
            </div>
            <span className={`${styles.itemAmount} ${isCredit ? styles.credit : ''}`}>
              {isCredit ? '+ ' : '− '}
              {formatCurrency(tx.amount)}
            </span>
          </div>
        );
      })}
    </div>
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
          <IconSelect label="Bandeira" value={brand} onChange={setBrand} options={BRAND_OPTIONS} />
          <IconSelect
            label="Banco / Fintech"
            value={institution}
            onChange={setInstitution}
            options={INSTITUTION_OPTIONS}
          />
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
        <IconSelect
          label="Conta que paga a fatura"
          placeholder="Selecione (opcional)..."
          value={paymentAccountId}
          onChange={setPaymentAccountId}
          options={[
            { value: '', label: 'Selecione (opcional)...' },
            ...cashAccounts.map(cashAccountOption),
          ]}
        />
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
          <IconSelect
            label="Pagar com"
            placeholder="Selecione..."
            value={accountId}
            onChange={setAccountId}
            options={cashAccounts.map(cashAccountOption)}
          />
          <div className={styles.formRow}>
            <MoneyField label="Valor" value={amount} onChange={setAmount} />
            <DateField label="Data" value={date} onChange={setDate} />
          </div>
        </form>
      )}
    </Modal>
  );
}
