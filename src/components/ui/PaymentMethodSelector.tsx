import type { ReactNode } from 'react';
import { CreditCard, Banknote, Wallet, Barcode } from 'lucide-react';
import { siPix } from 'simple-icons';
import type { PaymentMethod } from '../../types';
import { METHOD_LABELS } from '../../utils/paymentMethods';
import styles from './PaymentMethodSelector.module.css';

/** Logo oficial do PIX, herdando a cor do botão (currentColor). */
function PixIcon() {
  return (
    <svg role="img" aria-label="PIX" viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
      <path d={siPix.path} />
    </svg>
  );
}

// Ordem e ícone de cada método. "credit" usa conta de cartão; os demais saem
// de uma conta de dinheiro.
const METHODS: { value: PaymentMethod; icon: ReactNode }[] = [
  { value: 'pix', icon: <PixIcon /> },
  { value: 'debit', icon: <CreditCard size={18} /> },
  { value: 'cash', icon: <Banknote size={18} /> },
  { value: 'credit', icon: <Wallet size={18} /> },
  { value: 'boleto', icon: <Barcode size={18} /> },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  label?: string;
}

/** Seletor visual (botões com ícone) das formas de pagamento. */
export function PaymentMethodSelector({
  value,
  onChange,
  label = 'Método de pagamento',
}: PaymentMethodSelectorProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.grid}>
        {METHODS.map(({ value: method, icon }) => (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`${styles.btn} ${value === method ? styles.btnActive : ''}`}
          >
            {icon}
            <span>{METHOD_LABELS[method]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
