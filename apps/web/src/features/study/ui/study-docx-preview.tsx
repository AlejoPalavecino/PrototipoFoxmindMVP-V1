import { useEffect, useState } from 'react';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { createStudyClient } from '../api/study-client';
import s from './study.module.css';

type Props = { folderId: string; sourceId: string; title: string; downloadHref: string; onClose: () => void };

export function StudyDocxPreview({ folderId, sourceId, title, downloadHref, onClose }: Props) {
  const [preview, setPreview] = useState<{ text: string } | null>();
  useEffect(() => {
    let active = true;
    const path = `/${encodeURIComponent(folderId)}/docx-preview/${encodeURIComponent(sourceId)}`;
    void createStudyClient().call<{ text: string }>(path).then(result => {
      if (active) setPreview(typeof result.text === 'string' ? result : null);
    }).catch(() => { if (active) setPreview(null); });
    return () => { active = false; };
  }, [folderId, sourceId]);

  return <Dialog title={title} label="Vista previa DOCX" labeledClose onClose={onClose}>
    <div className={s.dialogBody}>
      <div className={s.fileLinks}>
        <span>Vista previa de texto</span>
        <a href={downloadHref}>Descargar original</a>
      </div>
      {preview === undefined ? <AsyncFeedback compact title="Abriendo el documento…"/>
        : preview === null ? <Notice error>No pudimos mostrar la vista previa.</Notice>
        : preview.text.trim() ? <article aria-label="Texto del documento" className={s.docxPreview}>{preview.text}</article>
        : <Notice>Este documento no contiene texto para mostrar.</Notice>}
    </div>
  </Dialog>;
}
