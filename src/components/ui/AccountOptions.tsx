import type { Account } from '../../types';

interface AccountOptionsProps {
  accounts: Account[];
}

const toOptions = (accounts: Account[]) =>
  accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ));

/**
 * Opções de um <select> de contas. Quando há contas de dinheiro e cartões
 * juntos, separa em <optgroup> ("Contas"/"Cartões"); se há só um tipo, lista as
 * opções direto (sem o rótulo de grupo, que seria redundante). Deve ser usado
 * dentro de um <Select>, normalmente após uma <option> de placeholder/"todas".
 */
export function AccountOptions({ accounts }: AccountOptionsProps) {
  const cash = accounts.filter((a) => a.type !== 'credit');
  const cards = accounts.filter((a) => a.type === 'credit');

  // Só agrupa (com rótulo) quando os dois tipos coexistem.
  if (cash.length === 0 || cards.length === 0) {
    return <>{toOptions(accounts)}</>;
  }

  return (
    <>
      <optgroup label="Contas">{toOptions(cash)}</optgroup>
      <optgroup label="Cartões">{toOptions(cards)}</optgroup>
    </>
  );
}
