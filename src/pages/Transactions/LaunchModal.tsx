import { useMemo, useState, type ReactNode } from 'react';
import { addMonths } from 'date-fns';
import { Calendar, CreditCard, Landmark, Repeat, Wallet } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { DateField } from '../../components/ui/DateField';
import { IconSelect, type IconSelectOption } from '../../components/ui/IconSelect';
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { recurringService } from '../../services/recurring.service';
import { payLoanInstallment } from '../../utils/loanPayment';
import { dateInputValue, formatCurrency, parseDateInput } from '../../utils/format';
import {
  CASH_METHODS,
  emptyLaunchForm,
  methodForNature,
  poolFor,
  reconcileAccount,
  type ExpenseNature,
  type LaunchFormState,
  type LaunchKind,
  type Recurrence,
} from './launchForm';
import type { Account, Frequency, PaymentMethod, Transaction } from '../../types';
import styles from './Transactions.module.css';

interface LaunchModalProps {
  open: boolean;
  kind: LaunchKind;
  /** Transação em edição (só lançamentos únicos); `null` ao criar. */
  editing: Transaction | null;
  onClose: () => void;
}

// Conta vira opção do IconSelect com a logo certa: banco (institution) para
// contas de dinheiro, bandeira (brand) para cartões.
const accountToOption = (a: Account): IconSelectOption => ({
  value: a.id,
  label: a.name,
  icon: <BrandLogo slug={a.type === 'credit' ? a.brand : a.institution} size={22} radius={6} />,
});

/**
 * Fluxo guiado de Adicionar Receita / Adicionar Despesa. Um passo escolhe entre
 * lançamento único e recorrente; na despesa, outro passo define a natureza
 * (cartão de crédito, pagamento de empréstimo ou gasto à vista). Roteia o submit
 * para o serviço certo (transações, recorrências ou pagamento de empréstimo).
 */
export function LaunchModal({ open, kind, editing, onClose }: LaunchModalProps) {
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const loans = useDataStore((s) => s.loans);

  // O formulário é inicializado a cada abertura porque o pai remonta o modal
  // (via `key`) ao abrir: em criação parte dos primeiros itens disponíveis; em
  // edição, dos valores da transação.
  const [form, setForm] = useState<LaunchFormState>(() => {
    if (editing) {
      const nature: ExpenseNature = editing.paymentMethod === 'credit' ? 'card' : 'cash';
      return emptyLaunchForm({
        nature,
        amountCents: editing.amount,
        description: editing.description,
        categoryId: editing.categoryId,
        accountId: editing.accountId,
        date: dateInputValue(editing.date),
        paymentMethod:
          editing.paymentMethod && editing.paymentMethod !== 'credit'
            ? editing.paymentMethod
            : 'pix',
      });
    }
    return emptyLaunchForm({
      categoryId: categories.find((c) => c.type === kind)?.id ?? '',
      accountId: accounts.find((a) => a.type !== 'credit')?.id ?? accounts[0]?.id ?? '',
    });
  });
  const [submitting, setSubmitting] = useState(false);

  const isExpense = kind === 'expense';

  const activeLoans = useMemo(
    () => loans.filter((l) => l.status === 'active' && l.nextDueDate),
    [loans],
  );
  const creditCards = useMemo(() => accounts.filter((a) => a.type === 'credit'), [accounts]);
  const categoriesForKind = useMemo(
    () => categories.filter((c) => c.type === kind),
    [categories, kind],
  );

  const isRecurring = form.recurrence === 'recurring';
  const isCard = isExpense && form.nature === 'card';
  const isLoan = isExpense && form.nature === 'loan';
  const isCash = !isExpense || form.nature === 'cash';

  const selectedLoan = activeLoans.find((l) => l.id === form.loanId);
  // Parcelamento só numa compra nova (não edição, não recorrente) no cartão.
  const canInstall = !editing && isCard && !isRecurring;

  const accountPool = poolFor(kind, form.nature, accounts);

  const categoryOptions = useMemo<IconSelectOption[]>(
    () =>
      categoriesForKind.map((c) => ({
        value: c.id,
        label: c.name,
        icon: <span className={styles.categoryEmoji}>{c.icon}</span>,
      })),
    [categoriesForKind],
  );

  const loanOptions = useMemo<IconSelectOption[]>(
    () => activeLoans.map((l) => ({ value: l.id, label: l.name, icon: <Landmark size={18} /> })),
    [activeLoans],
  );

  // Natureza da despesa: empréstimo só faz sentido como pagamento único e avulso.
  const natureOptions = useMemo<{ value: ExpenseNature; label: string; icon: ReactNode }[]>(() => {
    const opts: { value: ExpenseNature; label: string; icon: ReactNode }[] = [
      { value: 'card', label: 'Cartão', icon: <CreditCard size={16} /> },
    ];
    if (!editing && !isRecurring) {
      opts.push({ value: 'loan', label: 'Empréstimo', icon: <Landmark size={16} /> });
    }
    opts.push({ value: 'cash', label: 'Débito/PIX', icon: <Wallet size={16} /> });
    return opts;
  }, [editing, isRecurring]);

  const installmentPreview = (() => {
    if (!canInstall) return undefined;
    const n = Math.max(1, Math.min(60, Math.trunc(Number(form.installments)) || 1));
    if (!form.amountCents || n <= 1) return undefined;
    return `${n}× de aprox. ${formatCurrency(Math.floor(form.amountCents / n))}`;
  })();

  // Gera de imediato os recorrentes já vencidos, para refletirem na hora.
  const generateDueNow = async () => {
    try {
      const generated = await recurringService.processDue();
      if (generated > 0) {
        toast.success(
          `${generated} ${generated === 1 ? 'lançamento gerado' : 'lançamentos gerados'}`,
        );
      }
    } catch {
      // Silencioso: a recorrência já foi salva; tenta de novo no próximo load.
    }
  };

  const setRecurrence = (recurrence: Recurrence) => {
    // Empréstimo não é recorrente: cai para "à vista" ao ligar a recorrência.
    const nature = recurrence === 'recurring' && form.nature === 'loan' ? 'cash' : form.nature;
    setForm({
      ...form,
      recurrence,
      nature,
      accountId: reconcileAccount(kind, nature, form.accountId, accounts),
    });
  };

  const setNature = (nature: ExpenseNature) => {
    setForm({ ...form, nature, accountId: reconcileAccount(kind, nature, form.accountId, accounts) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pagamento de empréstimo: lança a próxima parcela (valor/conta vêm do empréstimo).
    if (isLoan) {
      if (!selectedLoan) return toast.error('Selecione um empréstimo');
      setSubmitting(true);
      try {
        const { settled } = await payLoanInstallment(selectedLoan);
        toast.success(settled ? 'Empréstimo quitado! 🎉' : 'Parcela registrada');
        onClose();
      } catch {
        toast.error('Não foi possível registrar a parcela');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const amount = form.amountCents;
    if (!amount || amount <= 0) return toast.error('Informe um valor maior que zero');
    if (!form.description.trim()) return toast.error('Informe uma descrição');
    if (!form.categoryId)
      return toast.error(isExpense ? 'Selecione uma categoria' : 'Selecione o tipo de receita');
    if (!form.accountId) return toast.error(isCard ? 'Selecione um cartão' : 'Selecione uma conta');
    if (isRecurring && !form.nextDueDate)
      return toast.error('Informe a data do próximo lançamento');

    const method: PaymentMethod | null = isExpense
      ? methodForNature(form.nature, form.paymentMethod)
      : null;

    setSubmitting(true);
    try {
      // Recorrente → cria a regra (as transações são geradas pelo engine/catch-up).
      if (isRecurring) {
        await recurringService.create({
          type: kind,
          amount,
          description: form.description.trim(),
          categoryId: form.categoryId,
          accountId: form.accountId,
          frequency: form.frequency,
          nextDueDate: form.nextDueDate,
          isActive: form.isActive,
          paymentMethod: method,
        });
        toast.success('Recorrência criada');
        onClose();
        void generateDueNow();
        return;
      }

      // Compra parcelada no cartão: materializa N transações, uma por mês.
      const installments = canInstall
        ? Math.max(1, Math.min(60, Math.trunc(Number(form.installments)) || 1))
        : 1;
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
        onClose();
        return;
      }

      const payload = {
        type: kind,
        amount,
        description: form.description.trim(),
        categoryId: form.categoryId,
        accountId: form.accountId,
        date: parseDateInput(form.date),
        paymentMethod: method,
      };
      if (editing) {
        await transactionService.update(editing.id, payload);
        toast.success('Lançamento atualizado');
      } else {
        await transactionService.create(payload);
        toast.success(isExpense ? 'Despesa registrada' : 'Receita registrada');
      }
      onClose();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const title = editing
    ? isExpense
      ? 'Editar despesa'
      : 'Editar receita'
    : isExpense
      ? 'Adicionar despesa'
      : 'Adicionar receita';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            variant={isExpense ? 'danger' : 'success'}
            disabled={isLoan && !selectedLoan}
          >
            {isLoan ? 'Pagar parcela' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.formStack}>
        {!editing && (
          <div className={styles.segRow}>
            {(['single', 'recurring'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrence(r)}
                className={`${styles.segBtn} ${form.recurrence === r ? styles.segBtnActive : ''}`}
              >
                {r === 'single' ? <Calendar size={16} /> : <Repeat size={16} />}
                <span>{r === 'single' ? 'Única' : 'Recorrente'}</span>
              </button>
            ))}
          </div>
        )}

        {isExpense && (
          <div className={styles.segRow}>
            {natureOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNature(opt.value)}
                className={`${styles.segBtn} ${form.nature === opt.value ? styles.segBtnActive : ''}`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {isLoan ? (
          <>
            <IconSelect
              label="Empréstimo"
              placeholder={activeLoans.length ? 'Selecione...' : 'Nenhum empréstimo ativo'}
              value={form.loanId}
              onChange={(v) => setForm({ ...form, loanId: v })}
              options={loanOptions}
              hint={
                activeLoans.length === 0
                  ? 'Nenhum empréstimo ativo — cadastre um em Empréstimos.'
                  : undefined
              }
            />
            {selectedLoan && (
              <div className={styles.loanPreview}>
                <div>
                  <span>Próxima parcela</span>
                  <strong>
                    {selectedLoan.installmentsPaid + 1}/{selectedLoan.installmentsTotal}
                  </strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{formatCurrency(selectedLoan.installmentAmount)}</strong>
                </div>
                <div>
                  <span>Conta</span>
                  <strong>{accounts.find((a) => a.id === selectedLoan.accountId)?.name ?? '—'}</strong>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Input
              label="Descrição"
              placeholder={isExpense ? 'Ex.: Mercado da semana' : 'Ex.: Salário de agosto'}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              autoFocus
            />

            <div className={styles.formRow}>
              <MoneyField
                label="Valor"
                value={form.amountCents}
                onChange={(cents) => setForm({ ...form, amountCents: cents })}
              />
              {isRecurring ? (
                <Select
                  label="Frequência"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </Select>
              ) : (
                <DateField
                  label="Data"
                  value={form.date}
                  onChange={(date) => setForm({ ...form, date })}
                />
              )}
            </div>

            <IconSelect
              label={isExpense ? 'Categoria' : 'Tipo de receita'}
              placeholder="Selecione..."
              value={form.categoryId}
              onChange={(v) => setForm({ ...form, categoryId: v })}
              options={categoryOptions}
              hint={
                categoriesForKind.length === 0
                  ? 'Nenhuma categoria — crie em Categorias.'
                  : undefined
              }
            />

            {isExpense && isCash && (
              <PaymentMethodSelector
                value={form.paymentMethod}
                methods={CASH_METHODS}
                onChange={(method) => setForm({ ...form, paymentMethod: method })}
              />
            )}

            <IconSelect
              label={isCard ? 'Cartão' : 'Conta'}
              placeholder="Selecione..."
              value={form.accountId}
              onChange={(v) => setForm({ ...form, accountId: v })}
              options={accountPool.map(accountToOption)}
              hint={
                isCard && creditCards.length === 0
                  ? 'Nenhum cartão cadastrado — cadastre um em Cartões.'
                  : undefined
              }
            />

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

            {isRecurring && (
              <>
                <DateField
                  label="Próximo lançamento"
                  value={form.nextDueDate}
                  onChange={(nextDueDate) => setForm({ ...form, nextDueDate })}
                />
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span>Ativa (gera lançamentos automaticamente)</span>
                </label>
              </>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
