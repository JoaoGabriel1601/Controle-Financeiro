import {
  siNubank,
  siPicpay,
  siMercadopago,
  siPagseguro,
  siNeon,
  siWise,
  siRevolut,
  siN26,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

export interface BrandDef {
  /** Slug guardado no banco (accounts.brand / accounts.institution). */
  slug: string;
  label: string;
  /** Cor da marca, `RRGGBB` sem `#`. Usada como fundo do chip. */
  hex: string;
  /** Glyph da logo oficial quando disponível (simple-icons); senão usa iniciais. */
  icon?: SimpleIcon;
}

/**
 * Bandeiras de cartão (rede). As logos full-color vêm do pacote
 * `react-svg-credit-card-payment-icons` (ver BrandLogo); aqui ficam só
 * label/cor para os selects e o fallback.
 */
export const CARD_BRANDS: BrandDef[] = [
  { slug: 'visa', label: 'Visa', hex: '1A1F71' },
  { slug: 'mastercard', label: 'Mastercard', hex: 'EB001B' },
  { slug: 'elo', label: 'Elo', hex: '00A4E0' },
  { slug: 'amex', label: 'American Express', hex: '2E77BC' },
  { slug: 'hipercard', label: 'Hipercard', hex: '822124' },
];

/** Bancos e fintechs. Logo oficial quando o simple-icons tem; senão, iniciais. */
export const INSTITUTIONS: BrandDef[] = [
  { slug: 'nubank', label: 'Nubank', hex: '820AD1', icon: siNubank },
  { slug: 'itau', label: 'Itaú', hex: 'EC7000' },
  { slug: 'bb', label: 'Banco do Brasil', hex: '0033A0' },
  { slug: 'bradesco', label: 'Bradesco', hex: 'CC092F' },
  { slug: 'santander', label: 'Santander', hex: 'EC0000' },
  { slug: 'caixa', label: 'Caixa', hex: '0070AF' },
  { slug: 'inter', label: 'Inter', hex: 'FF7A00' },
  { slug: 'c6', label: 'C6 Bank', hex: '242424' },
  { slug: 'original', label: 'Original', hex: '00A859' },
  { slug: 'btg', label: 'BTG Pactual', hex: '001E62' },
  { slug: 'safra', label: 'Safra', hex: '00261C' },
  { slug: 'sicredi', label: 'Sicredi', hex: '3FA535' },
  { slug: 'sicoob', label: 'Sicoob', hex: '003641' },
  { slug: 'picpay', label: 'PicPay', hex: '21C25E', icon: siPicpay },
  { slug: 'mercadopago', label: 'Mercado Pago', hex: '00B1EA', icon: siMercadopago },
  { slug: 'pagbank', label: 'PagBank', hex: 'FFC801', icon: siPagseguro },
  { slug: 'neon', label: 'Neon', hex: '00E0FF', icon: siNeon },
  { slug: 'stone', label: 'Stone', hex: '00A868' },
  { slug: 'wise', label: 'Wise', hex: '163300', icon: siWise },
  { slug: 'revolut', label: 'Revolut', hex: '191C1F', icon: siRevolut },
  { slug: 'n26', label: 'N26', hex: '48AC98', icon: siN26 },
  { slug: 'xp', label: 'XP', hex: '0A0A0A' },
];

const BY_SLUG = new Map<string, BrandDef>(
  [...CARD_BRANDS, ...INSTITUTIONS].map((b) => [b.slug, b]),
);

export function findBrand(slug: string | null | undefined): BrandDef | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Iniciais (até 2 letras) a partir do nome, para o fallback sem logo. */
export function brandInitials(label: string): string {
  const words = label.split(/\s+/).filter((w) => !/^(de|do|da|of)$/i.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
}

/** Decide texto claro/escuro conforme a luminância do fundo. */
export function readableOn(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0b1020' : '#ffffff';
}
