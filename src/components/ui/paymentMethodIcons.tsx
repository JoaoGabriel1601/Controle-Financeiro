import type { ReactNode } from 'react';
import { CreditCard, Banknote, Wallet, Barcode } from 'lucide-react';
import { siPix } from 'simple-icons';
import type { PaymentMethod } from '../../types';

// Logo oficial do PIX, na cor da marca (teal). Elemento simples (não um
// componente) para o módulo exportar apenas dados — exigência do fast refresh.
const pixIcon = (
  <svg role="img" aria-label="PIX" viewBox="0 0 24 24" width={18} height={18} fill="#32BCAD">
    <path d={siPix.path} />
  </svg>
);

// Ícone de cada forma de pagamento, reaproveitado no seletor e nos filtros.
export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  pix: pixIcon,
  debit: <CreditCard size={18} />,
  cash: <Banknote size={18} />,
  credit: <Wallet size={18} />,
  boleto: <Barcode size={18} />,
};

// Ordem de exibição (compras à vista primeiro; crédito e boleto por último).
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['pix', 'debit', 'cash', 'credit', 'boleto'];
