import Image from 'next/image';
import type { Logo } from '@/content/schema';

/**
 * A product's real logo, with its suffix ("OS") set beside it in the display face. The heights in
 * the content balance the logos against each other; `scale` keeps that balance at another size.
 * The files are small and served as they are.
 */
export function ProductLogo({ logo, scale = 1 }: { logo: Logo; scale?: number }) {
  const height = Math.round(logo.height * scale);
  return (
    <>
      <Image src={logo.src} alt={logo.alt} width={Math.round(height * logo.ratio)} height={height} style={{ height, width: 'auto' }} unoptimized />
      {logo.suffix ? <>{' '}<span className="display" style={{ fontSize: Math.round(height * 1.12) }}>{logo.suffix}</span></> : null}
    </>
  );
}
