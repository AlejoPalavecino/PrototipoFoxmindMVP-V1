import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { useEffect, useState } from 'react';
import type { StudyFolder } from '../model/study-contracts.ts';
import { Notice } from '../../../../../shared-ui/feedback';
import s from './study.module.css';
import { studyUploadPolicy, validateStudyUpload } from '../model/study-file-policy';
import { studyUploadRequest as call, type StudyUploadStatus as Status } from '../api/study-upload-client';
import { studyCsrf } from '../model/study-csrf.ts';
export function StudyUpload({
  purpose,
  ensureFolder,
  onReady,
  onSelect,
  onBusyChange,
}: {
  purpose: 'plan' | 'material';
  ensureFolder: () => Promise<StudyFolder>;
  onReady: (id: string, title: string) => void;
  onSelect?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const policy = studyUploadPolicy(purpose);
  const [file, FileState] = useState<File>();
  const [status, Status] = useState<Status>();
  const [folderId, FolderId] = useState('');
  const [busy, Busy] = useState(false);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const [error, SetError] = useState('');
  async function upload() {
    if (!file) return;
    const invalid = validateStudyUpload(purpose, file);
    if (invalid) {
      SetError(invalid);
      return;
    }
    Busy(true);
    SetError('');
    try {
      const folder = await ensureFolder();
      FolderId(folder.id);
      const begin = await call(
        `/${folder.id}/uploads`,
        'POST',
        JSON.stringify({ name: file.name, bytes: file.size, purpose }),
        undefined,
        studyCsrf,
      );
      const sent = await call(`/${folder.id}/uploads/${begin.id}`, 'PUT', file, undefined, studyCsrf);
      Status(sent);
      if (sent.ready) onReady(sent.id, sent.name);
    } catch (e) {
      SetError(e instanceof Error ? e.message : 'No pudimos cargar el archivo.');
    } finally {
      Busy(false);
    }
  }
  return (
    <section className={s.upload}>
      <label>
        {purpose === 'plan' ? 'Documento del plan' : 'Agregar material propio'}
        <input
          type="file"
          accept={policy.accept}
          aria-required={purpose === 'plan'}
          disabled={busy}
          onChange={e => {
            FileState(e.target.files?.[0]);
            onSelect?.();
            Status(undefined);
            SetError('');
          }}
        />
      </label>
      <p>{policy.label}</p>
      {purpose === 'material' && (
        <p>
          Podés guardar estos formatos. Foxy sólo usa los documentos que puede leer; si no hay un lector disponible para
          un archivo, te lo avisa.
        </p>
      )}
      <button type="button" disabled={!file || busy || status?.ready} onClick={() => void upload()}>
        {busy ? 'Cargando y validando…' : 'Cargar archivo'}
      </button>
      {busy && (
        <AsyncFeedback
          compact
          title="Cargando y validando tu archivo"
          detail="El documento estará disponible cuando termine la revisión."
        />
      )}
      {status && (
        <p role="status">
          {status.ready
            ? 'Archivo listo'
            : status.rejectionCode
              ? 'Archivo rechazado. Elegí otro documento.'
              : 'Archivo en validación; todavía no se usa para estudiar.'}
        </p>
      )}
      {status && !status.ready && !status.rejectionCode && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            Busy(true);
            void call(`/${folderId}/uploads/${status.id}`)
              .then(v => {
                Status(v);
                if (v.ready) onReady(v.id, v.name);
              })
              .catch(e => SetError(e.message))
              .finally(() => Busy(false));
          }}
        >
          Consultar validación
        </button>
      )}
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
