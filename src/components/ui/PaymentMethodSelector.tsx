import type { PaymentMethod } from '../../types';
import { METHOD_LABELS } from '../../utils/paymentMethods';
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_ORDER } from './paymentMethodIcons';
import styles from './PaymentMethodSelector.module.css';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  label?: string;
  /** Restringe as formas exibidas (ex.: só à vista, sem crédito). Padrão: todas. */
  methods?: PaymentMethod[];
}

/** Seletor visual (botões com ícone) das formas de pagamento. */
export function PaymentMethodSelector({
  value,
  onChange,
  label = 'Método de pagamento',
  methods = PAYMENT_METHOD_ORDER,
}: PaymentMethodSelectorProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.grid}>
        {methods.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`${styles.btn} ${value === method ? styles.btnActive : ''}`}
          >
            {PAYMENT_METHOD_ICONS[method]}
            <span>{METHOD_LABELS[method]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
