import type { Account } from '../../types';

interface AccountOptionsProps {
  accounts: Account[];
}

/**
 * Opções de um <select> de contas, separando "Contas" (dinheiro) de "Cartões"
 * (crédito) em <optgroup> distintos. Deve ser usado dentro de um <Select>,
 * normalmente após uma <option> de placeholder/"todas".
 */
export function AccountOptions({ accounts }: AccountOptionsProps) {
  const cash = accounts.filter((a) => a.type !== 'credit');
  const cards = accounts.filter((a) => a.type === 'credit');

  return (
    <>
      {cash.length > 0 && (
        <optgroup label="Contas">
          {cash.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      )}
      {cards.length > 0 && (
        <optgroup label="Cartões">
          {cards.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
