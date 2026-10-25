import { useState } from 'react';
import { foxmindAssets, type BrandVariant } from './foxmind-assets';

export interface FoxmindBrandProps {
  variant?: BrandVariant;
  className?: string;
  decorative?: boolean;
}

/** The original ZorroH artwork, intact. Naming remains available if art fails. */
export function FoxmindBrand({ variant = 'horizontal', className = '', decorative = false }: FoxmindBrandProps) {
  const asset = foxmindAssets.brand[variant];
  const [failedSource, setFailedSource] = useState<string>();
  const failed = failedSource === asset.src;
  return <span className={`fm3d-brand fm3d-brand--${variant} ${className}`}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'FoxMind'}
    aria-hidden={decorative || undefined} style={{ aspectRatio: `${asset.width} / ${asset.height}` }}>
    <img src={asset.src} width={asset.width} height={asset.height} alt="" decoding="async"
      style={{ visibility: failed ? 'hidden' : undefined }}
      onError={() => setFailedSource(asset.src)} onLoad={() => setFailedSource(undefined)} />
    {failed && <span className="fm3d-brand-fallback">FoxMind</span>}
  </span>;
}
