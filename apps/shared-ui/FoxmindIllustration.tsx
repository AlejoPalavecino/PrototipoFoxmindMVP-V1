import { useState } from 'react';
import { illustrationCatalog, type IllustrationKey } from './raster-catalog';

export interface FoxmindIllustrationProps {
  name: IllustrationKey;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Decoration only: consumer keeps headings, controls and all status information in HTML. */
export function FoxmindIllustration({ name, className = '', priority = false,
  sizes = '(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 40vw, 360px',
}: FoxmindIllustrationProps) {
  const asset = illustrationCatalog[name];
  const [width, height, src] = asset.variants[2];
  const [failedSource, setFailedSource] = useState<string>();
  const kind = name.split('/')[0];
  return <span className={`fm3d-illustration fm3d-illustration--${kind} ${className}`}
    aria-hidden="true" style={{ aspectRatio: `${width} / ${height}` }}>
    <img src={src} srcSet={asset.variants.map(([w, , url]) => `${url} ${w}w`).join(', ')}
      sizes={sizes} width={width} height={height} alt="" decoding={priority ? 'sync' : 'async'}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'low'}
      style={{ objectPosition: asset.position, visibility: failedSource === src ? 'hidden' : undefined }}
      onError={() => setFailedSource(src)} onLoad={() => setFailedSource(undefined)} />
  </span>;
}
