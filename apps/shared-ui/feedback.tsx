'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { openDialog } from './dialog-focus';
import { FoxmindIcon } from './FoxmindIcon';

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
  label,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  label?: string;
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
      aria-label={label}
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
          <FoxmindIcon name="close" />
        </button>
      </header>
      <div className="brujula-dialog-body">{children}</div>
    </dialog>
  );
}
