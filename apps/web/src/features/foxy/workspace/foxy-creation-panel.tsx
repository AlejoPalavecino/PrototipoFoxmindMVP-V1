import type { ReactNode } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

export type FoxyCreationTagKind = 'note' | 'plan' | 'rubric' | 'quiz' | 'activity' | 'diagram' | 'other';

/** Short type tag shown in the header of the open creation. */
export function foxyCreationTag(label: string | undefined, quiz: boolean): { text: string; kind: FoxyCreationTagKind } {
  if (quiz) return { text: 'Quiz', kind: 'quiz' };
  if (label === 'Preparar un apunte') return { text: 'Apunte', kind: 'note' };
  if (label === 'Planificar una clase') return { text: 'Plan de clase', kind: 'plan' };
  if (label === 'Pensar una rúbrica') return { text: 'Rúbrica', kind: 'rubric' };
  if (label === 'Crear una actividad') return { text: 'Actividad', kind: 'activity' };
  return { text: 'Creación', kind: 'other' };
}

/** After the panel closes, the person continues in the chat. */
export function focusFoxyChat() {
  if (typeof document === 'undefined') return;
  const focus = () => document.querySelector<HTMLTextAreaElement>('.parity-ai-chat textarea')?.focus({ preventScroll: true });
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus); else queueMicrotask(focus);
}

/** Frame of the creation shown beside the chat: type tag, saved status, close, scrolling body and sticky actions. */
export function FoxyCreationPanelFrame({ tag, kind, status, onClose, closeDisabled, headerActions, footer, children }: {
  tag: string; kind: FoxyCreationTagKind; status: string; onClose: () => void; closeDisabled?: boolean;
  headerActions?: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  return <div className="parity-foxy-panel">
    <header className="parity-foxy-panelHead">
      <span className="parity-foxy-panelTag" data-kind={kind}>{tag}</span>
      <span className="parity-foxy-panelStatus">{status}</span>
      <div className="parity-foxy-panelHeadActions">
        {headerActions}
        <button type="button" className="parity-foxy-panelClose" aria-label="Cerrar panel" disabled={closeDisabled} onClick={onClose}><FoxmindIcon name="close"/></button>
      </div>
    </header>
    <div className="parity-foxy-panelBody">{children}</div>
    {footer}
  </div>;
}
