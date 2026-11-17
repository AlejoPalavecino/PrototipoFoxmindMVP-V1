import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FileState } from '../../../../../../src/core/contracts/materials.ts';

export interface ClassroomPlanFileOperations {
  upload(file: File): Promise<FileState>;
  status(id: string, signal?: AbortSignal): Promise<FileState>;
}

/** Owns one file selection, its upload and approval polling; no curriculum or draft writes. */
export function useClassroomPlanFile(operations: ClassroomPlanFileOperations, planFileId: string | undefined,
  actionLock: RefObject<boolean>, mounted: RefObject<boolean>,
  feedback: { ready: (id: string) => void; start: () => void; error: (message: string) => void }) {
  const [file, setFile] = useState<FileState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFailure, setUploadFailure] = useState('');
  const fileSelection = useRef(0);
  const callbacks = useRef(feedback);
  callbacks.current = feedback;
  useEffect(() => {
    if (!planFileId) {
      setFile(null);
      return;
    }
    const controller = new AbortController();
    const selection = fileSelection.current;
    const isCurrent = () => !controller.signal.aborted && selection === fileSelection.current;
    void operations
      .status(planFileId, controller.signal)
      .then(state => { if (isCurrent()) setFile(state); })
      .catch((e) => {
        if (isCurrent()) callbacks.current.error(e.message);
      });
    return () => controller.abort();
  }, [operations, planFileId]);
  useEffect(() => {
    if (typeof document === 'undefined' || uploading || !file || file.ready || file.rejectionCode
      || file.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(file.scan)) return;
    const controller = new AbortController();
    const selection = fileSelection.current;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 1500;
    const check = async () => {
      if (document.hidden) { timer = setTimeout(check, delay); return; }
      try {
        const next = await operations.status(file.id, controller.signal);
        if (controller.signal.aborted || selection !== fileSelection.current || actionLock.current || next.id !== file.id) return;
        setUploadFailure('');
        if (next.ready) {
          callbacks.current.ready(next.id);
          callbacks.current.error('');
        }
        if (next.ready || next.rejectionCode || next.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(next.scan)) {
          setFile(next); return;
        }
        delay = Math.min(delay * 2, 10_000);
        timer = setTimeout(check, delay);
      } catch {
        if (!controller.signal.aborted && selection === fileSelection.current) { callbacks.current.error('No pudimos consultar el archivo. Probá consultar su estado nuevamente.'); setUploadFailure('No pudimos consultar el archivo. Podés volver a consultar su estado sin subirlo otra vez.'); }
      }
    };
    timer = setTimeout(check, delay);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [operations, file, uploading]);
  async function upload(chosen: File | undefined) {
    if (!chosen || actionLock.current) return;
    if (!/\.(pdf|doc|docx|ppt|pptx)$/i.test(chosen.name) || chosen.size > 20_000_000 || chosen.size === 0) {
      callbacks.current.error('Elegí un PDF, Word o PowerPoint de hasta 20 MB con contenido.'); return;
    }
    actionLock.current = true;
    const selection = ++fileSelection.current;
    callbacks.current.start(); setUploadFailure('');
    setUploading(true);
    setUploadName(chosen.name);
    callbacks.current.error('');
    try {
      const state = await operations.upload(chosen);
      if (!mounted.current || selection !== fileSelection.current) return;
      setFile(state);
      if (state.ready) callbacks.current.ready(state.id);
      else if (state.rejectionCode || state.validation === 'REJECTED' || ['REJECTED', 'ERROR'].includes(state.scan)) {
        callbacks.current.error('El archivo no está aprobado. Revisá su estado o elegí otro archivo.');
        setUploadFailure('El archivo no está aprobado. Elegí otro archivo para continuar.');
      }
    } catch (e) {
      if (mounted.current && selection === fileSelection.current) { callbacks.current.error((e as Error).message); setUploadFailure((e as Error).message); }
    } finally {
      if (mounted.current && selection === fileSelection.current) { actionLock.current = false; setUploading(false); setUploadName(''); }
    }
  }
  async function refresh() {
    if (actionLock.current || !file) return;
    actionLock.current = true;
    setUploading(true);
    callbacks.current.error('');
    setUploadFailure('');
    const selection = fileSelection.current;
    try {
      const state = await operations.status(file.id);
      if (!mounted.current || selection !== fileSelection.current) return;
      setFile(state);
      if (state.ready) callbacks.current.ready(state.id);
    } catch (failure) {
      if (mounted.current && selection === fileSelection.current) {
        callbacks.current.error((failure as Error).message);
        setUploadFailure((failure as Error).message);
      }
    } finally {
      if (mounted.current && selection === fileSelection.current) {
        actionLock.current = false;
        setUploading(false);
      }
    }
  }
  return { file, uploading, uploadName, uploadFailure, upload, refresh,
    remove() { fileSelection.current += 1; setFile(null); },
  };
}
