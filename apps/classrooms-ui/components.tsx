'use client';
import { FoxmindIllustration } from '../shared-ui/index.ts';
// Compatibility for classroom consumers; generic feedback belongs to shared UI.
export { Dialog, Notice } from '../shared-ui/feedback';
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
