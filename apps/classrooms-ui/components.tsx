'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { openDialog } from '../shared-ui/dialog-focus';
export const coverCatalog = [
  { key: 'explore', label: 'Explorar' },
  { key: 'create', label: 'Crear' },
  { key: 'discover', label: 'Descubrir' },
];
export function Cover({ kind = 'explore' }: { kind?: string }) {
  const selected = coverCatalog.find((cover) => cover.key === kind) ?? coverCatalog[0];
  return <div className={`folder-cover folder-cover-${selected.key}`} role="img" aria-label={`Portada ${selected.label}`}>
    <img className="folder-cover-art" src={`/folders/cover-${selected.key}.png`} width="192" height="192" alt="" loading="lazy" />
  </div>;
}

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={error ? 'p5-notice error' : 'p5-notice'}
      role={error ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = 'p5-dialog-title';
  useEffect(() => {
    return openDialog(ref.current!);
  }, []);
  return (
    <dialog
      className={`p5-dialog ${className}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label="Cerrar diálogo"
          className="p5-close"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function initials(firstName: string, lastName: string) {
  return (firstName[0] ?? '') + (lastName[0] ?? '');
}
