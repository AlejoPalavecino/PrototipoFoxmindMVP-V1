import { useState } from 'react';
import { Dialog } from '../../../../../shared-ui/feedback';
import styles from '../../../../../shared-ui/interactive-diagram.module.css';
import type { StudySource } from '../model/study-contracts.ts';
import { StudyDocxPreview } from './study-docx-preview';

export function StudyReferencedMaterialsDialog({ folderId, items, onClose }: {
  folderId: string;
  items: StudySource[];
  onClose(): void;
}) {
  const [preview, setPreview] = useState<{ source: StudySource; href: string }>();
  return <Dialog title="Fuentes consultadas" onClose={onClose}>
    <ul className={styles.sourceList}>{items.map(source => {
      const id = encodeURIComponent(source.fileId);
      const href = source.origin === 'OWN'
        ? `/api/v1/study-folders/${encodeURIComponent(folderId)}/uploads/${id}/file`
        : `/api/v1/files/${id}/content`;
      return <li key={source.id}>{source.extension === 'docx'
        ? <button type="button" className={styles.secondary} onClick={() => setPreview({ source, href })}>{source.title}</button>
        : <a href={href + '?mode=preview'} target="_blank" rel="noopener noreferrer">{source.title}</a>}
      </li>;
    })}</ul>
    {preview && <StudyDocxPreview folderId={folderId} sourceId={preview.source.id} title={preview.source.title}
      downloadHref={preview.href + '?mode=download'} onClose={() => setPreview(undefined)} />}
  </Dialog>;
}
