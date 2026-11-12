'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
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
  labeledClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  label?: string;
  labeledClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
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
          className={labeledClose ? 'p5-close fm-dialog-close-label' : 'p5-close'}
          onClick={onClose}
        >
          <FoxmindIcon name="close" />
          {labeledClose && <span>Cerrar</span>}
        </button>
      </header>
      <div className="brujula-dialog-body">{children}</div>
    </dialog>
  );
}
