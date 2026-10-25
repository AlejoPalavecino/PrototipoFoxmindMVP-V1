'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { openDialog } from '../shared-ui/dialog-focus';
import { FoxmindIllustration } from '../shared-ui/index.ts';
import { classroomCoverAsset } from '../../src/core/domain/index.ts';
export const coverCatalog = [
  { key: 'literature', label: 'Literatura' },
  { key: 'math', label: 'Matemática' },
  { key: 'biology', label: 'Biología' },
  { key: 'society', label: 'Sociedad' },
  { key: 'science', label: 'Ciencia y tecnología' },
  { key: 'creative', label: 'Arte y creatividad' },
  { key: 'general', label: 'General' },
];
export function coverOptions(current?: string) {
  return current && ['explore', 'create', 'discover'].includes(current)
    ? [{ key: current, label: 'Portada actual' }, ...coverCatalog] : coverCatalog;
}
export function Cover({ kind = 'explore', priority = false }: { kind?: string; priority?: boolean }) {
  const selected = coverCatalog.find((cover) => cover.key === kind) ?? coverCatalog[6];
  const asset = classroomCoverAsset(kind);
  return <div className={`folder-cover fm3-cover folder-cover-${selected.key}`}>
    <FoxmindIllustration name={`covers/${asset}`} className="folder-cover-art" priority={priority}
      sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 1100px) 45vw, 360px" />
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
