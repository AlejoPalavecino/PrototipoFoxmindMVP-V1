/** Fixed identifiers shared by identity and presentation; never accept avatar URLs. */
export const ACCOUNT_AVATARS = [
  { key: 'initials', label: 'Mis iniciales', src: null },
  { key: 'foxy-classic', label: 'Foxy clásico', src: '/brujula/avatars/foxy-classic.webp' },
  { key: 'foxy-reader', label: 'Foxy lector', src: '/brujula/avatars/foxy-reader.webp' },
  { key: 'foxy-explorer', label: 'Foxy explorador', src: '/brujula/avatars/foxy-explorer.webp' },
  { key: 'foxy-creative', label: 'Foxy creativo', src: '/brujula/avatars/foxy-creative.webp' },
] as const;
export type AccountAvatarKey = typeof ACCOUNT_AVATARS[number]['key'];
export function isAccountAvatarKey(value: unknown): value is AccountAvatarKey {
  return ACCOUNT_AVATARS.some(avatar => avatar.key === value);
}
export function accountAvatar(value: unknown) {
  return ACCOUNT_AVATARS.find(avatar => avatar.key === value) ?? ACCOUNT_AVATARS[0];
}
