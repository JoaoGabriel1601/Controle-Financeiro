import { brandInitials, findBrand, readableOn } from '../../utils/brands';

interface BrandLogoProps {
  /** Slug da marca (bandeira ou instituição). */
  slug: string | null | undefined;
  size?: number;
  /** Cantos arredondados do chip (px). */
  radius?: number;
  title?: string;
}

/**
 * Chip com a logo da marca: fundo na cor da marca + glyph oficial (simple-icons)
 * quando existe; senão, iniciais. Cor do conteúdo escolhida por contraste.
 */
export function BrandLogo({ slug, size = 32, radius = 8, title }: BrandLogoProps) {
  const brand = findBrand(slug);
  if (!brand) return null;

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
