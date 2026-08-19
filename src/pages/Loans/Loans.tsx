import { useMemo, useState } from 'react';
import { Plus, Trash2, Landmark, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { DateField } from '../../components/ui/DateField';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { loanService } from '../../services/loan.service';
import { payLoanInstallment } from '../../utils/loanPayment';
import { dateInputValue, formatCurrency, formatDate, parseDateInput } from '../../utils/format';
import { roundCents } from '../../utils/money';
import type { Loan, LoanInput } from '../../types';
import styles from './Loans.module.css';

interface FormState {
  name: string;
  lender: string;
  principalCents: number;
  installmentsTotal: string;
  firstDueDate: string;
  accountId: string;
  categoryId: string;
}

const emptyForm = (accountId: string): FormState => ({
  name: '',
  lender: '',
  principalCents: 0,
  installmentsTotal: '12',
  firstDueDate: dateInputValue(new Date()),
  accountId,
  categoryId: '',
});

export function LoansPage() {
  const loans = useDataStore((s) => s.loans);
  const accounts = useDataStore((s) => s.accounts);
  const categories = useDataStore((s) => s.categories);

  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Loan | null>(null);
  const [removing, setRemoving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const installmentPreview = (() => {
    const cents = form.principalCents;
    const n = Math.trunc(Number(form.installmentsTotal));
    if (!cents || !n || n < 1) return undefined;
    return `${n}× de ${formatCurrency(roundCents(cents / n))}`;
  })();

  const openNew = () => {
    setForm(emptyForm(cashAccounts[0]?.id ?? ''));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = form.principalCents;
    const total = Math.trunc(Number(form.installmentsTotal));
    if (!form.name.trim()) return toast.error('Informe o nome do empréstimo');
    if (!principal || principal <= 0) return toast.error('Informe o valor total');
    if (!total || total < 1) return toast.error('Informe o número de parcelas');
    if (!form.accountId) return toast.error('Selecione a conta que paga as parcelas');
    if (!form.firstDueDate) return toast.error('Informe a data da primeira parcela');

    setSubmitting(true);
    try {
      const payload: LoanInput = {
        name: form.name.trim(),
        lender: form.lender.trim() || null,
        principalAmount: principal,
        installmentAmount: roundCents(principal / total),
        installmentsTotal: total,
        accountId: form.accountId,
        categoryId: form.categoryId || null,
        dayOfMonth: parseDateInput(form.firstDueDate).getDate(),
        nextDueDate: form.firstDueDate,
      };
      await loanService.create(payload);
      toast.success('Empréstimo cadastrado');
      setModalOpen(false);
      // Gera de imediato as parcelas já vencidas (1ª data <= hoje).
      void loanService.processDue().catch(() => undefined);
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  // "Pagar agora": lança a próxima parcela com data de hoje e avança o cronograma
  // a partir da data ORIGINAL prevista (preservando as datas seguintes).
  const payNow = async (loan: Loan) => {
    if (!loan.nextDueDate || loan.status !== 'active') return;
    setPayingId(loan.id);
    try {
      const { settled } = await payLoanInstallment(loan);
      toast.success(settled ? 'Empréstimo quitado! 🎉' : 'Parcela registrada');
    } catch {
      toast.error('Não foi possível registrar a parcela');
    } finally {
      setPayingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await loanService.remove(deleting.id);
      toast.success('Empréstimo removido');
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
          <h1 className={styles.title}>Empréstimos</h1>
          <p className={styles.subtitle}>
            Acompanhe as parcelas pendentes — geradas automaticamente nas datas previstas.
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openNew} disabled={cashAccounts.length === 0}>
          Novo empréstimo
        </Button>
      </header>

      {loans.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Landmark size={28} />}
            title="Nenhum empréstimo cadastrado"
            description={
              cashAccounts.length === 0
                ? 'Cadastre uma conta de dinheiro em Contas para registrar um empréstimo.'
                : 'Cadastre um empréstimo para acompanhar as parcelas pendentes e o saldo devedor.'
            }
            action={
              cashAccounts.length > 0 ? (
                <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                  Novo empréstimo
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {loans.map((loan) => {
            const remaining = Math.max(0, loan.installmentsTotal - loan.installmentsPaid);
            const remainingAmount = remaining * loan.installmentAmount;
            const pct = Math.round((loan.installmentsPaid / loan.installmentsTotal) * 100);
            const acc = accountMap.get(loan.accountId);
            const settled = loan.status === 'settled';
            return (
              <Card key={loan.id} className={settled ? styles.settled : undefined}>
                <div className={styles.itemHead}>
                  <span className={styles.itemIcon}>
                    <Landmark size={18} />
                  </span>
                  <div className={styles.itemInfo}>
                    <strong>{loan.name}</strong>
                    <span>
                      {loan.lender ? `${loan.lender} · ` : ''}
                      {acc?.name ?? '—'}
                    </span>
                  </div>
                  {settled ? (
                    <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                      Quitado
                    </Badge>
                  ) : (
                    <div className={styles.installmentValue}>
                      {formatCurrency(loan.installmentAmount)}
                      <span>/parcela</span>
                    </div>
                  )}
                </div>

                <div className={styles.progressArea}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.progressMeta}>
                    <span>
                      {loan.installmentsPaid}/{loan.installmentsTotal} parcelas
                    </span>
                    {!settled && (
                      <span>
                        Restam <strong>{formatCurrency(remainingAmount)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.itemFooter}>
                  {settled ? (
                    <span className={styles.footerNote}>
                      Total {formatCurrency(loan.principalAmount)}
                    </span>
                  ) : (
                    <span className={styles.footerNote}>
                      Próxima: {loan.nextDueDate ? formatDate(parseDateInput(loan.nextDueDate)) : '—'}
                    </span>
                  )}
                  <div className={styles.footerActions}>
                    {!settled && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={payingId === loan.id}
                        onClick={() => payNow(loan)}
                      >
                        Pagar parcela
                      </Button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeleting(loan)}
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo empréstimo"
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
            placeholder="Ex.: Empréstimo carro"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Credor (opcional)"
            placeholder="Ex.: Banco XPTO"
            value={form.lender}
            onChange={(e) => setForm({ ...form, lender: e.target.value })}
          />
          <div className={styles.formRow}>
            <MoneyField
              label="Valor total"
              value={form.principalCents}
              onChange={(cents) => setForm({ ...form, principalCents: cents })}
            />
            <Input
              label="Nº de parcelas"
              type="number"
              min={1}
              max={360}
              value={form.installmentsTotal}
              onChange={(e) => setForm({ ...form, installmentsTotal: e.target.value })}
              hint={installmentPreview}
            />
          </div>
          <DateField
            label="Primeira parcela"
            value={form.firstDueDate}
            onChange={(firstDueDate) => setForm({ ...form, firstDueDate })}
            hint="As próximas vencem no mesmo dia dos meses seguintes."
          />
          <Select
            label="Conta que paga"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Selecione...</option>
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select
            label="Categoria (opcional)"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover empréstimo"
        description={`Remover "${deleting?.name}"? As parcelas já lançadas como transações não são afetadas.`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
