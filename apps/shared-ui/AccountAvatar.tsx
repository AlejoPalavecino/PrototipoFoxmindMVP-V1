import { useState } from 'react';
import { accountAvatar } from '../../src/core/domain/account-avatar';

/** Decorative identity image; the enclosing account control supplies its name. */
export function AccountAvatar({ avatarKey, initials, className = '' }: { avatarKey?: string; initials: string; className?: string }) {
  const avatar = accountAvatar(avatarKey);
  const [failed, setFailed] = useState<string>();
  return <span className={`fm-account-avatar ${className}`} aria-hidden="true">
    {avatar.src && failed !== avatar.src ? <img src={avatar.src} alt="" width={512} height={512} onError={() => setFailed(avatar.src!)} /> : initials}
  </span>;
}
