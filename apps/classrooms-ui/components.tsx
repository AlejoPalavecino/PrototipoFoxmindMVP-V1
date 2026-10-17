'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export const coverCatalog = [
  { key: 'explore', label: 'Explorar' },
  { key: 'create', label: 'Crear' },
  { key: 'discover', label: 'Descubrir' },
];
export function Cover({ kind = 'explore' }: { kind?: string }) {
  const color =
    kind === 'create' ? '#6f8c73' : kind === 'discover' ? '#8177af' : '#d77d37';
  return (
    <svg
      className="p5-cover"
      viewBox="0 0 640 240"
      role="img"
      aria-label={`Portada ${coverCatalog.find((c) => c.key === kind)?.label ?? 'Explorar'}`}
    >
      <rect
        width="640"
        height="240"
        fill={
          kind === 'create'
            ? '#e4ede2'
            : kind === 'discover'
              ? '#eeebf6'
              : '#fff0de'
        }
      />
      <circle cx="490" cy="73" r="45" fill={color} opacity=".3" />
      <path
        d="M0 225 150 85 294 225 400 125 640 240H0Z"
        fill={color}
        opacity=".35"
      />
      <path
        d="m276 77 45 15 46-15v99l-46 15-45-15Z"
        fill="white"
        stroke={color}
        strokeWidth="5"
      />
      <path
        d="M321 92v99m-33-84 20 6m-20 12 20 6m26-18 20-6m-20 24 20-6"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m102 53 7 18 19 1-15 12 5 19-16-11-16 11 5-19-15-12 19-1Z"
        fill={color}
        opacity=".6"
      />
    </svg>
  );
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = 'p5-dialog-title';
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className="p5-dialog"
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
