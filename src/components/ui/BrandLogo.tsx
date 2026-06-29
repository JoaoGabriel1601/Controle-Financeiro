import type { ComponentType, SVGProps } from 'react';
// Só o formato `logo` (marca pura, sem fundo nem texto). Importar do subpath do
// formato evita empacotar os variantes pesados (flat/mono/etc.) de cada bandeira.
import {
  Visa as VisaLogoIcon,
  Mastercard as MastercardLogoIcon,
  AmericanExpress as AmericanExpressLogoIcon,
  Elo as EloLogoIcon,
  Hipercard as HipercardLogoIcon,
} from 'react-svg-credit-card-payment-icons/icons/logo';
import nubankSvg from '../../assets/banks/nubank.svg';
import itauSvg from '../../assets/banks/itau.svg';
import bbSvg from '../../assets/banks/bb.svg';
import bradescoSvg from '../../assets/banks/bradesco.svg';
import santanderSvg from '../../assets/banks/santander.svg';
import caixaSvg from '../../assets/banks/caixa.svg';
import interSvg from '../../assets/banks/inter.svg';
import c6Svg from '../../assets/banks/c6.svg';
import originalSvg from '../../assets/banks/original.svg';
import btgSvg from '../../assets/banks/btg.svg';
import safraSvg from '../../assets/banks/safra.svg';
import sicrediSvg from '../../assets/banks/sicredi.svg';
import sicoobSvg from '../../assets/banks/sicoob.svg';
import picpaySvg from '../../assets/banks/picpay.svg';
import mercadopagoSvg from '../../assets/banks/mercadopago.svg';
import pagbankSvg from '../../assets/banks/pagbank.svg';
import neonSvg from '../../assets/banks/neon.svg';
import stoneSvg from '../../assets/banks/stone.svg';
import xpSvg from '../../assets/banks/xp.svg';
import { brandInitials, findBrand, readableOn } from '../../utils/brands';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Proporção do canvas das bandeiras (780×500). */
const BRAND_RATIO = 780 / 500;

/**
 * Bandeiras de cartão — pacote `react-svg-credit-card-payment-icons`, formato
 * `logo`: a marca pura da rede (fundo transparente, sem texto). No Mastercard,
 * por exemplo, são apenas os dois círculos.
 */
const BRAND_LOGO: Record<string, IconComponent> = {
  visa: VisaLogoIcon,
  mastercard: MastercardLogoIcon,
  amex: AmericanExpressLogoIcon,
  elo: EloLogoIcon,
  hipercard: HipercardLogoIcon,
};

// Logos oficiais de bancos/fintechs (SVG), renderizadas num tile branco.
const BANK_LOGOS: Record<string, string> = {
  nubank: nubankSvg,
  itau: itauSvg,
  bb: bbSvg,
  bradesco: bradescoSvg,
  santander: santanderSvg,
  caixa: caixaSvg,
  inter: interSvg,
  c6: c6Svg,
  original: originalSvg,
  btg: btgSvg,
  safra: safraSvg,
  sicredi: sicrediSvg,
  sicoob: sicoobSvg,
  picpay: picpaySvg,
  mercadopago: mercadopagoSvg,
  pagbank: pagbankSvg,
  neon: neonSvg,
  stone: stoneSvg,
  xp: xpSvg,
};

interface BrandLogoProps {
  /** Slug da marca (bandeira ou instituição). */
  slug: string | null | undefined;
  size?: number;
  /** Cantos arredondados do chip/tile (px). */
  radius?: number;
  title?: string;
  /**
   * Aparência da bandeira:
   * - `tile` (padrão): marca da rede num tile branco quadrado, coerente com os
   *   bancos em listas, selects e avatares.
   * - `mark`: marca pura sem fundo (só o símbolo) para a face do cartão.
   * Bancos/fintechs ignoram esta prop (sempre tile).
   */
  variant?: 'tile' | 'mark';
}

/**
 * Logo da marca. Bandeiras de cartão usam o pacote de ícones de pagamento;
 * bancos/fintechs usam a logo oficial local; o resto cai num chip com iniciais.
 * O `variant` mantém a aparência coerente entre os contextos do app.
 */
export function BrandLogo({ slug, size = 32, radius = 8, title, variant = 'tile' }: BrandLogoProps) {
  const brand = findBrand(slug);
  if (!brand) return null;
  const label = title ?? brand.label;

  const LogoMark = slug ? BRAND_LOGO[slug] : undefined;

  // Bandeira em "mark": só o símbolo, sem fundo (face do cartão).
  if (variant === 'mark' && LogoMark) {
    return (
      <span
        title={label}
        style={{ display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}
      >
        <LogoMark
          height={size}
          width={Math.round(size * BRAND_RATIO)}
          role="img"
          aria-label={label}
        />
      </span>
    );
  }

  // Bandeira em tile: marca da rede centralizada num tile branco (igual aos bancos).
  if (LogoMark) {
    const inner = Math.round(size * 0.78);
    return (
      <span
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: radius,
          background: '#ffffff',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <LogoMark width={inner} role="img" aria-label={label} />
      </span>
    );
  }

  // Banco/fintech com logo oficial: tile branco com a logo centralizada.
  const bankLogo = slug ? BANK_LOGOS[slug] : undefined;
  if (bankLogo) {
    return (
      <span
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: radius,
          background: '#ffffff',
          padding: Math.round(size * 0.14),
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={bankLogo}
          alt={label}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </span>
    );
  }

  // Fallback: chip na cor da marca (glyph simple-icons ou iniciais).
  const bg = `#${brand.hex}`;
  const fg = readableOn(brand.hex);

  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {brand.icon ? (
        <svg
          role="img"
          aria-label={label}
          viewBox="0 0 24 24"
          width={size * 0.62}
          height={size * 0.62}
          fill={fg}
        >
          <path d={brand.icon.path} />
        </svg>
      ) : (
        <span style={{ fontSize: size * 0.4, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {brandInitials(brand.label)}
        </span>
      )}
    </span>
  );
}
