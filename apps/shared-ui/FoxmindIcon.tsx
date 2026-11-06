import type { IconKey } from './foxmind-assets';
const referenceNames: Partial<Record<IconKey,string>> = {home:'house',book:'book-open',calendar:'calendar-days',chat:'message-circle',clipboard:'clipboard-list',clock:'clock',close:'x',edit:'square-pen',attach:'paperclip',help:'circle-alert',profile:'user-round',progress:'chart-column',refresh:'refresh-cw',spark:'sparkles',shield:'shield-check',warning:'triangle-alert',more:'ellipsis',logout:'log-out',filter:'list-filter',trash:'trash-2','eye-off':'eye-off'};

export interface FoxmindIconProps { name: IconKey; className?: string }

/** Button/link owners provide their accessible name; this vector is decorative. */
export function FoxmindIcon({ name, className = '' }: FoxmindIconProps) {
  return <svg className={`fm3d-icon ${className}`} width="24" height="24" viewBox="0 0 24 24"
    aria-hidden="true" focusable="false">
    <use href={`/brujula/icons.svg#${referenceNames[name] ?? name}`} />
  </svg>;
}
