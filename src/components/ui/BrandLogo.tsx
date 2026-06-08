import visaSvg from 'payment-icons/min/flat/visa.svg';
import mastercardSvg from 'payment-icons/min/flat/mastercard.svg';
import amexSvg from 'payment-icons/min/flat/amex.svg';
import eloSvg from 'payment-icons/min/flat/elo.svg';
import hipercardSvg from 'payment-icons/min/flat/hipercard.svg';
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

// Logos full-color das bandeiras (SVG de cartão arredondado, proporção ~3:2).
const CARD_LOGOS: Record<string, string> = {
  visa: visaSvg,
  mastercard: mastercardSvg,
  amex: amexSvg,
  elo: eloSvg,
  hipercard: hipercardSvg,
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
}

/**
 * Logo da marca. Bandeiras de cartão e bancos/fintechs usam a logo oficial
 * (SVG full-color); fintechs internacionais sem SVG local caem no glyph do
 * simple-icons; o resto, num chip com iniciais.
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

  // Banco/fintech com logo oficial: tile branco com a logo centralizada.
  const bankLogo = slug ? BANK_LOGOS[slug] : undefined;
  if (bankLogo) {
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
          background: '#ffffff',
          padding: Math.round(size * 0.14),
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={bankLogo}
          alt={brand.label}
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
