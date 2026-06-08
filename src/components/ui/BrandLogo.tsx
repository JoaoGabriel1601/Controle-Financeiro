import visaSvg from 'payment-icons/min/flat/visa.svg';
import mastercardSvg from 'payment-icons/min/flat/mastercard.svg';
import amexSvg from 'payment-icons/min/flat/amex.svg';
import eloSvg from 'payment-icons/min/flat/elo.svg';
import hipercardSvg from 'payment-icons/min/flat/hipercard.svg';
import { brandInitials, findBrand, readableOn } from '../../utils/brands';

// Logos full-color das bandeiras (SVG de cartão arredondado, proporção ~3:2).
const CARD_LOGOS: Record<string, string> = {
  visa: visaSvg,
  mastercard: mastercardSvg,
  amex: amexSvg,
  elo: eloSvg,
  hipercard: hipercardSvg,
};

interface BrandLogoProps {
  /** Slug da marca (bandeira ou instituição). */
  slug: string | null | undefined;
  size?: number;
  /** Cantos arredondados do chip de instituição (px). */
  radius?: number;
  title?: string;
}

/**
 * Logo da marca. Bandeiras de cartão usam a logo oficial full-color; bancos e
 * fintechs usam um chip na cor da marca com o glyph oficial (simple-icons)
 * quando existe, ou iniciais como fallback.
 */
export function BrandLogo({ slug, size = 32, radius = 8, title }: BrandLogoProps) {
  const brand = findBrand(slug);
  if (!brand) return null;

  // Bandeira: logo oficial colorida (tile de cartão, ~1,5× de largura).
  const cardLogo = slug ? CARD_LOGOS[slug] : undefined;
  if (cardLogo) {
    return (
      <img
        src={cardLogo}
        alt={brand.label}
        title={title ?? brand.label}
        style={{ height: size, width: 'auto', flexShrink: 0, display: 'block' }}
      />
    );
  }

  // Instituição: chip na cor da marca.
  const bg = `#${brand.hex}`;
  const fg = readableOn(brand.hex);

  return (
    <span
      title={title ?? brand.label}
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
          aria-label={brand.label}
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
