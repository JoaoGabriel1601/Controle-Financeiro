import { useEffect, useId, useRef } from 'react';
import styles from './Input.module.css';

interface MoneyFieldProps {
  label?: string;
  /** Valor em centavos inteiros. */
  value: number;
  /** Recebe o novo valor já em centavos inteiros. */
  onChange: (cents: number) => void;
  error?: string;
  hint?: string;
  id?: string;
  autoFocus?: boolean;
  /** Limite de dígitos (evita estouro). Padrão 12 → R$ 9.999.999.999,99. */
  maxDigits?: number;
}

/** Formata centavos como moeda pt-BR sem o símbolo (ex.: 123456 → "1.234,56"). */
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Campo de valor no estilo dos apps de banco: aceita apenas dígitos, que entram
 * pela direita formando os centavos (digita "5" → 0,05; "1234" → 12,34). As duas
 * casas decimais ficam sempre travadas e letras/símbolos são ignorados. O valor
 * é mantido em centavos inteiros, alinhado a `utils/money`.
 */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
  id,
  autoFocus,
  maxDigits = 12,
}: MoneyFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ref = useRef<HTMLInputElement>(null);

  const display = formatCents(value);

  // Mantém o cursor sempre no fim (digitação só acontece pela direita).
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  }, [display]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxDigits);
    onChange(digits ? parseInt(digits, 10) : 0);
  };

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.errorWrap : ''}`}>
        <span className={styles.leftIcon}>R$</span>
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${styles.withLeftIcon}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={display}
          onChange={handleChange}
        />
      </div>
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </div>
  );
}
