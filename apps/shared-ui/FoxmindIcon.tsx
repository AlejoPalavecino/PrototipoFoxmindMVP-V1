import type { IconKey } from './foxmind-assets';
const referenceNames: Partial<Record<IconKey, string>> = {
  home: 'house',
  book: 'book-open',
  calendar: 'calendar-days',
  chat: 'message-circle',
  'chat-square': 'message-square',
  pencil: 'pencil',
  clipboard: 'clipboard-list',
  clock: 'clock',
  close: 'x',
  edit: 'square-pen',
  attach: 'paperclip',
  help: 'circle-alert',
  profile: 'user-round',
  progress: 'chart-column',
  refresh: 'refresh-cw',
  spark: 'sparkles',
  shield: 'shield-check',
  warning: 'triangle-alert',
  more: 'ellipsis',
  logout: 'log-out',
  filter: 'list-filter',
  trash: 'trash-2',
  'eye-off': 'eye-off',
};
const workspacePaths: Partial<Record<IconKey, string>> = {
  'chat-square': 'M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h5',
  pencil: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
  'foxy-folder': 'M3 6h7l2 3h9v11H3ZM3 6V4h6l2 2',
};

export interface FoxmindIconProps {
  name: IconKey;
  className?: string;
}

/** Button/link owners provide their accessible name; this vector is decorative. */
export function FoxmindIcon({ name, className = '' }: FoxmindIconProps) {
  return (
    <svg
      className={`fm3d-icon ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {workspacePaths[name] ? (
        <path
          d={workspacePaths[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <use href={`/brujula/icons.svg#${referenceNames[name] ?? name}`} />
      )}
    </svg>
  );
}
