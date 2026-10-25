import { foxmindAssets, type IconKey } from './foxmind-assets';

export interface FoxmindIconProps { name: IconKey; className?: string }

/** Button/link owners provide their accessible name; this vector is decorative. */
export function FoxmindIcon({ name, className = '' }: FoxmindIconProps) {
  return <svg className={`fm3d-icon ${className}`} width="24" height="24" viewBox="0 0 24 24"
    aria-hidden="true" focusable="false">
    <use href={`${foxmindAssets.iconSprite}#${name}`} />
  </svg>;
}
