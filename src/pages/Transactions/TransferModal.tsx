import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MoneyField } from '../../components/ui/MoneyField';
import { DateField } from '../../components/ui/DateField';
import { IconSelect, type IconSelectOption } from '../../components/ui/IconSelect';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { transactionService } from '../../services/transaction.service';
import { dateInputValue, parseDateInput } from '../../utils/format';
import type { Account, Transaction } from '../../types';
import styles from './Transactions.module.css';

interface TransferModalProps {
  open: boolean;
  /** Transferência em edição; `null` ao criar. */
  editing: Transaction | null;
  onClose: () => void;
}

interface FormState {
  amountCents: number;
  description: string;
  accountId: string;
  toAccountId: string;
  date: string;
}

const accountToOption = (a: Account): IconSelectOption => ({
  value: a.id,
  label: a.name,
  icon: <BrandLogo slug={a.institution} size={22} radius={6} />,
});

/** Modal enxuto para mover dinheiro entre duas contas (não altera saldo total). */
export function TransferModal({ open, editing, onClose }: TransferModalProps) {
  const accounts = useDataStore((s) => s.accounts);
  const cashAccounts = useMemo(() => accounts.filter((a) => a.type !== 'credit'), [accounts]);

  // Inicializado a cada abertura (o pai remonta via `key`): em edição parte da
  // transferência; em criação, das duas primeiras contas de dinheiro.
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          amountCents: editing.amount,
          description: editing.description,
          accountId: editing.accountId,
          toAccountId: editing.toAccountId ?? '',
          date: dateInputValue(editing.date),
        }
      : {
          amountCents: 0,
          description: '',
          accountId: cashAccounts[0]?.id ?? '',
          toAccountId: cashAccounts[1]?.id ?? '',
          date: dateInputValue(new Date()),
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amountCents || form.amountCents <= 0)
      return toast.error('Informe um valor maior que zero');
    if (!form.description.trim()) return toast.error('Informe uma descrição');
    if (!form.accountId) return toast.error('Selecione a conta de origem');
    if (!form.toAccountId) return toast.error('Selecione a conta de destino');
    if (form.accountId === form.toAccountId)
      return toast.error('Origem e destino devem ser contas diferentes');

    setSubmitting(true);
    try {
      const payload = {
        type: 'transfer' as const,
        amount: form.amountCents,
        description: form.description.trim(),
        categoryId: '',
        accountId: form.accountId,
        toAccountId: form.toAccountId,
        date: parseDateInput(form.date),
      };
      if (editing) {
        await transactionService.update(editing.id, payload);
        toast.success('Transferência atualizada');
      } else {
        await transactionService.create(payload);
        toast.success('Transferência registrada');
      }
      onClose();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar transferência' : 'Transferência'}
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
          label="Descrição"
          placeholder="Ex.: Transferência para poupança"
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
          <DateField label="Data" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        </div>

        <IconSelect
          label="Conta de origem"
          placeholder="Selecione..."
          value={form.accountId}
          onChange={(v) => setForm({ ...form, accountId: v })}
          options={cashAccounts.map(accountToOption)}
        />

        <IconSelect
          label="Conta de destino"
          placeholder="Selecione..."
          value={form.toAccountId}
          onChange={(v) => setForm({ ...form, toAccountId: v })}
          options={cashAccounts.map(accountToOption)}
        />
      </form>
    </Modal>
  );
}
