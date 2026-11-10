'use client';
import type { Payload } from '../../src/core/contracts/classrooms.ts';
import { FoxmindIllustration } from './index.ts';
// Compatibility for classroom consumers; generic feedback belongs to shared UI.

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

export function initials(firstName: string, lastName: string) {
  return (firstName[0] ?? '') + (lastName[0] ?? '');
}


export function WizardCover({ payload, onUpdate, label = 'Portada del aula' }: { payload: Payload; onUpdate: (key: keyof Payload, value: unknown) => void; label?:string }) {
  return <fieldset className="wizard-cover-picker"><legend>{label}</legend>
    <div className="p5-covers">{coverOptions(payload.coverKey).map(cover => <label key={cover.key} className={payload.coverKey === cover.key ? 'selected' : ''}>
      <Cover kind={cover.key} /><span><input type="radio" name="coverKey" value={cover.key} checked={payload.coverKey === cover.key}
        onChange={() => onUpdate('coverKey', cover.key)} />{cover.label}</span>
    </label>)}</div>
  </fieldset>;
}
