import { useState } from 'react';
import { classroomCoverAsset } from '../../src/core/domain/index.ts';
import { illustrationCatalog } from '../shared-ui/index.ts';

/** Small visible-row art loads eagerly; PDF/screen capture must not race lazy image decoding. */
export function HomeCover({ coverKey }: { coverKey: string }) {
  const asset = illustrationCatalog[`covers/${classroomCoverAsset(coverKey)}`];
  const [width, height, src] = asset.variants[0];
  const [failed, setFailed] = useState(false);
  return <span className="fm-home-row-cover" aria-hidden="true">
    <img src={src} srcSet={asset.variants.map(([w, , url]) => `${url} ${w}w`).join(', ')}
      sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1200px) 40vw, 24vw" width={width} height={height}
      alt="" loading="eager" decoding="sync" fetchPriority="low"
      style={{ objectPosition: asset.position, visibility: failed ? 'hidden' : undefined }}
      onError={() => setFailed(true)} onLoad={() => setFailed(false)} />
  </span>;
}
