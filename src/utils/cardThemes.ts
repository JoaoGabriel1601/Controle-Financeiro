/**
 * Temas visuais dos cartões inspirados nos cartões reais de cada banco/fintech.
 * `background` é aplicado como fundo do cartão e `color` é a cor base do texto;
 * rótulos, chip e borda derivam dessa cor via `color-mix` no CSS.
 */
export interface CardTheme {
  /** Fundo (gradiente) do cartão. */
  background: string;
  /** Cor base do texto sobre o cartão. */
  color: string;
}

/** Tema padrão para cartões sem instituição reconhecida. */
export const DEFAULT_CARD_THEME: CardTheme = {
  background:
    'radial-gradient(120% 140% at 85% 0%, rgba(224, 85, 200, 0.4) 0%, transparent 55%), linear-gradient(150deg, #3a1d56 0%, #25143b 45%, #160d24 100%)',
  color: '#f4ecff',
};

const LIGHT = '#f7f9ff';
const DARK = '#0c1424';

// Cada cartão imita as cores/acabamento do cartão físico do respectivo banco.
const THEMES: Record<string, CardTheme> = {
  nubank: {
    background: 'linear-gradient(140deg, #9C2CF3 0%, #820AD1 55%, #5F0699 100%)',
    color: LIGHT,
  },
  itau: {
    background: 'linear-gradient(140deg, #FF9A2E 0%, #EC7000 50%, #B85400 100%)',
    color: LIGHT,
  },
  bb: {
    background: 'linear-gradient(140deg, #2A5BD7 0%, #0033A0 55%, #001E66 100%)',
    color: LIGHT,
  },
  bradesco: {
    background: 'linear-gradient(140deg, #E5183E 0%, #CC092F 55%, #8F011F 100%)',
    color: LIGHT,
  },
  santander: {
    background: 'linear-gradient(140deg, #FF2A2A 0%, #EC0000 50%, #A60000 100%)',
    color: LIGHT,
  },
  caixa: {
    background: 'linear-gradient(140deg, #0E97D9 0%, #0070AF 60%, #004B78 100%)',
    color: LIGHT,
  },
  inter: {
    background: 'linear-gradient(140deg, #FF9D40 0%, #FF7A00 55%, #E25C00 100%)',
    color: LIGHT,
  },
  c6: {
    background:
      'radial-gradient(120% 140% at 80% 10%, rgba(255,255,255,0.07) 0%, transparent 50%), linear-gradient(140deg, #3a3a3a 0%, #1c1c1c 55%, #080808 100%)',
    color: LIGHT,
  },
  original: {
    background:
      'radial-gradient(130% 150% at 90% 10%, rgba(0,168,89,0.45) 0%, transparent 55%), linear-gradient(140deg, #0e2a1c 0%, #0a1a12 55%, #050d09 100%)',
    color: LIGHT,
  },
  btg: {
    background: 'linear-gradient(140deg, #0A2A5E 0%, #001E62 55%, #000F33 100%)',
    color: LIGHT,
  },
  safra: {
    background: 'linear-gradient(140deg, #0A3D2E 0%, #00261C 60%, #00120D 100%)',
    color: LIGHT,
  },
  sicredi: {
    background: 'linear-gradient(140deg, #5FBF4F 0%, #3FA535 55%, #2A7A24 100%)',
    color: LIGHT,
  },
  sicoob: {
    background: 'linear-gradient(140deg, #00897A 0%, #003641 60%, #00222A 100%)',
    color: LIGHT,
  },
  picpay: {
    background: 'linear-gradient(140deg, #2BE673 0%, #21C25E 55%, #11823E 100%)',
    color: LIGHT,
  },
  mercadopago: {
    background: 'linear-gradient(140deg, #3FD3FF 0%, #00B1EA 55%, #0089B8 100%)',
    color: DARK,
  },
  pagbank: {
    background:
      'radial-gradient(130% 150% at 90% 10%, rgba(255,200,1,0.35) 0%, transparent 55%), linear-gradient(140deg, #0F8A5F 0%, #0A5E41 60%, #063A29 100%)',
    color: LIGHT,
  },
  neon: {
    background: 'linear-gradient(140deg, #00E0FF 0%, #0A3A6E 70%, #0A1A33 100%)',
    color: LIGHT,
  },
  stone: {
    background:
      'radial-gradient(130% 150% at 90% 10%, rgba(0,168,104,0.5) 0%, transparent 55%), linear-gradient(140deg, #0e2a1e 0%, #0a1a12 60%, #050d09 100%)',
    color: LIGHT,
  },
  wise: {
    background: 'linear-gradient(140deg, #C2F573 0%, #9FE870 45%, #6FBF3F 100%)',
    color: '#163300',
  },
  revolut: {
    background: 'linear-gradient(140deg, #2C2F33 0%, #191C1F 60%, #0A0C0E 100%)',
    color: LIGHT,
  },
  n26: {
    background: 'linear-gradient(140deg, #5BBFAA 0%, #2E7D6E 60%, #1A4D43 100%)',
    color: LIGHT,
  },
  xp: {
    background:
      'radial-gradient(120% 140% at 80% 10%, rgba(255,255,255,0.06) 0%, transparent 50%), linear-gradient(140deg, #1c1c1c 0%, #0d0d0d 60%, #000000 100%)',
    color: LIGHT,
  },
};

/** Tema do cartão para a instituição informada (ou o padrão). */
export function cardTheme(slug: string | null | undefined): CardTheme {
  return (slug && THEMES[slug]) || DEFAULT_CARD_THEME;
}
