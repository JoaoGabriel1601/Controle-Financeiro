import type { PaymentMethod } from '../types';

/** Rótulo amigável de cada forma de pagamento. */
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  debit: 'Débito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  credit: 'Crédito',
};
