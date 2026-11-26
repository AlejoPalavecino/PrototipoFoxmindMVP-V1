import { renderStudyFolderShell } from './wizard/study-folder-shell.tsx';
import { renderStudyFolderIdentity } from './wizard/study-folder-identity.tsx';
import { renderStudyFolderProgram } from './wizard/study-folder-program.tsx';
import { renderStudyFolderCurriculum } from './wizard/study-folder-curriculum.tsx';
import { renderStudyFolderReview } from './wizard/study-folder-review.tsx';
import { renderStudyFolderSidebar } from './wizard/study-folder-sidebar.tsx';
import { renderStudyFolderFooter } from './wizard/study-folder-footer.tsx';
import { steps } from './wizard/study-folder-steps.ts';
import { studyDraftOperations } from './study-folder-persistence.ts';
import { useEffect, useRef, useState } from 'react';

import { type EditorUnit } from '../../../../../shared-ui/academic-plan';
import { AiProgress } from '../../../../../shared-ui/AiProgress';

import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import type { StudyCollection, StudyFolder, StudyUnit } from '../model/study-contracts.ts';
import { validateStudyPlan } from '../model/study-transitions.ts';
import { studyUploadRequest, type StudyUploadStatus } from '../api/study-upload-client';
import { requireStudyPlan, validateStudyUpload } from '../model/study-file-policy';
const api = studyDraftOperations;
type Operation = 'upload' | 'check' | 'import' | 'analyze' | 'save' | 'create';
type PlanFile = Pick<StudyUploadStatus, 'id' | 'name' | 'ready'>;
export function StudyWizard({ catalog, folder, initialClassroomId, onClose, onCreated, onSaved, }: {
  catalog: StudyCollection;
  folder?: StudyFolder;
  initialClassroomId?: string;
  onClose: () => void;
  onSaved?: () => void;
  onCreated: (folder: StudyFolder) => void;
}) {
  const [step, setStep] = useState(folder?.wizardStep ?? 0), [name, setName] = useState(folder?.name ?? '');
  const [subject, setSubject] = useState(folder?.subject ?? '');
  const [year, setYear] = useState(String(folder?.academicYear ?? new Date().getFullYear()));
  // A new folder with exactly one available classroom starts linked to it; the student can still pick another origin.
  // A link to a specific classroom is honored only if the catalog authorizes it, and never replaced by another one.
  const openRooms = catalog.classrooms.filter(room => !room.archived);
  const initialLink = folder
    ? folder.linkedClassroomId ?? ''
    : initialClassroomId
      ? catalog.classrooms.find(room => room.id === initialClassroomId)?.id ?? ''
      : openRooms.length === 1 ? openRooms[0]!.id : '';
  const [banner, setBanner] = useState(folder?.bannerKey ?? 'literature'), [linked, setLinked] = useState(initialLink);
  const [programSource, setProgramSource] = useState(initialLink ? 'classroom' : 'own');
  const [units, setUnits] = useState<StudyUnit[]>(folder?.units ?? []);
  const [planId, setPlanId] = useState(folder?.planFileId ?? null);
  const [file, setFile] = useState<PlanFile | null>(folder?.planFileId
    ? {
      id: folder.planFileId,
      name: 'Documento del plan guardado',
      ready: false

    }
    : null);
  const [method, setMethod] = useState<'manual' | 'ai' | 'classroom' | null>(initialLink ? 'classroom' : null), [analysisFailed, setAnalysisFailed] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null), [error, setError] = useState('');
  const [dirty, setDirty] = useState(false), [saved, setSaved] = useState(!!folder), [leave, setLeave] = useState(false);
  const draft = useRef(folder), lock = useRef(false), fileVersion = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  const blocked = operation !== null;
  useEffect(() => {
    heading.current?.focus();

  }, [step]);
  useEffect(() => {
    if (!folder?.planFileId)
      return;
    const abort = new AbortController(), version = fileVersion.current;
    const current = () => !abort.signal.aborted && version === fileVersion.current;
    void studyUploadRequest(`/${folder.id}/uploads/${folder.planFileId}`, 'GET', undefined, abort.signal)
      .then((result) => {
        if (current())
          setFile(result);

      })
      .catch(() => {
        if (current())
          setError('No pudimos consultar el plan guardado. Volvé a consultar su estado.');

      });
    return () => abort.abort();

  }, [folder?.id, folder?.planFileId]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty || blocked)
        event.preventDefault();

    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);

  }, [dirty, blocked]);
  async function ensureDraft() {
    if (draft.current)
      return draft.current;
    const result = await api.create({
      name: name || 'Nueva carpeta',
      subject,
      wizardStep: step,
      academicYear: Number(year),
      bannerKey: banner,
      linkedClassroomId: linked || null,
      status: 'DRAFT',

    });
    return (draft.current = result.folder);

  }
  async function run(next: Operation, action: () => Promise<void>) {
    if (lock.current)
      return;
    lock.current = true;
    setOperation(next);
    setError('');
    try {
      await action();

    }
    catch (failure) {
      if ((next === 'save' || next === 'create' || next === 'analyze' || next === 'import') &&
        draft.current) {
        try {
          draft.current = (await api.load(draft.current.id)).folder;

        }
        catch {
          /* Keep the last known revision. */
        }

      }
      setError(failure instanceof Error ? failure.message : 'No pudimos completar la acción.');

    }
    finally {
      lock.current = false;
      setOperation(null);

    }

  }
  function applyFile(result: StudyUploadStatus) {
    setFile(result);
    setPlanId(result.ready ? result.id : null);
    setDirty(true);
    if (result.rejectionCode ||
      result.validation === 'REJECTED' ||
      ['REJECTED', 'ERROR'].includes(result.scan)) {
      setError('El archivo no fue aprobado. Elegí otro documento.');

    }

  }
  async function upload(chosen: File | undefined) {
    if (!chosen || lock.current)
      return;
    const invalid = validateStudyUpload('plan', chosen);
    if (invalid) {
      setError(invalid);
      return;

    }
    await run('upload', async () => {
      fileVersion.current++;
      setFile(null);
      setPlanId(null);
      setDirty(true);
      const current = await ensureDraft(), path = `/${current.id}/uploads`;
      const begun = await studyUploadRequest(path, 'POST', JSON.stringify({
        name: chosen.name,
        bytes: chosen.size,
        purpose: 'plan'

      }));
      setFile({
        id: begun.id,
        name: chosen.name,
        ready: false

      });
      applyFile(await studyUploadRequest(`${path}/${begun.id}`, 'PUT', chosen));

    });

  }
  function checkFile() {
    if (file && draft.current)
      void run('check', async () => {
        fileVersion.current++;
        applyFile(await studyUploadRequest(`/${draft.current!.id}/uploads/${file.id}`));

      });

  }
  async function selectedPlan(current: StudyFolder) {
    if (programSource !== 'classroom' || !linked || current.planOrigin?.classroomId === linked)
      return {
        folder: current,
        units

      };
    const result = await api.importPlan(current.id, current.revision, linked);
    draft.current = result.folder;
    setUnits(result.folder.units);
    return {
      folder: result.folder,
      units: result.folder.units

    };

  }
  function save(active = false, exit = false) {
    const invalid = active
      ? ((!subject.trim() ? 'Completá la materia para continuar.' : null) ??
        validateStudyPlan(name, year, units))
      : !/^\d{1,4}$/.test(year) || Number(year) < 1
        ? 'Revisá el año académico.'
        : null;
    if (invalid) {
      setError(invalid);
      return;

    }
    void run(active ? 'create' : 'save', async () => {
      const savedDraft = await ensureDraft();
      const prepared = savedDraft.planOrigin
        ? await selectedPlan(savedDraft)
        : {
          folder: savedDraft,
          units

        }, current = prepared.folder;
      const result = await api.save(current.id, {
        revision: current.revision,
        name,
        subject,
        wizardStep: step,
        academicYear: Number(year),
        bannerKey: banner,
        linkedClassroomId: linked || null,
        units: prepared.units,
        planFileId: planId,
        ...(active ? {
          status: 'ACTIVE'

        } : {}),

      });
      draft.current = result.folder;
      setDirty(false);
      setSaved(true);
      if (active)
        onCreated(result.folder);
      else if (exit)
        (onSaved ?? onClose)();

    });

  }
  function analyze() {
    if (lock.current || !file?.ready || !planId)
      return;
    setStep(2);
    setAnalysisFailed(false);
    void run('analyze', async () => {
      try {
        const current = await ensureDraft();
        if (current.planFileId !== planId)
          draft.current = (await api.save(current.id, {
            revision: current.revision,
            planFileId: planId

          })).folder;
        const result = await api.analyzePlan(current.id, draft.current!.revision);
        draft.current = result.folder;
        setUnits(result.folder.units);

      }
      catch (failure) {
        setAnalysisFailed(true);
        throw failure;

      }

    });

  }
  function importPlan() {
    if (lock.current)
      return;
    if (draft.current?.planOrigin?.classroomId === linked) {
      goTo(2);
      return;

    }
    if (!linked)
      return;
    void run('import', async () => {
      await selectedPlan(await ensureDraft());
      setSaved(true);
      setDirty(true);
      setStep(2);

    });

  }
  function goTo(next: number) {
    if (!blocked && !leave) {
      setError('');
      setStep(next);

    }

  }
  function advance() {
    if (lock.current || leave)
      return;
    if (step === 3) {
      save(true);
      return;

    }
    const invalid = step === 0
      ? ((!subject.trim() ? 'Completá el nombre y la materia para continuar.' : null) ??
        validateStudyPlan(name, year, units, false))
      : step === 1
        ? (!method ? 'Elegí de dónde sale tu recorrido.'
          : method === 'classroom' ? (!linked ? 'Elegí un aula para continuar.' : null)
            : method === 'ai' ? requireStudyPlan(file?.ready ? planId : null)
              : null)
        : validateStudyPlan(name, year, units);
    if (invalid) {
      setError(invalid);
      return;

    }
    if (step === 1 && method === 'ai') {
      analyze();
      return;

    }
    if (step === 1 && method === 'classroom') {
      importPlan();
      return;

    }
    if (step === 1 && method === 'manual' && !units.length) {
      // By hand starts from one empty unit with one topic, ready to name.
      setUnits([{ id: crypto.randomUUID(), title: '', topics: [{ id: crypto.randomUUID(), title: '' }] }]);
      setDirty(true);
    }
    if (step === 2 && method === 'ai' && analysisFailed)
      return;
    goTo(step + 1);

  }
  const editUnits: EditorUnit[] = units.map((unit) => ({
    id: unit.id,
    name: unit.title,
    topics: unit.topics.map((topic) => ({
      id: topic.id,
      name: topic.title

    })),

  }));
  const action = step === 3
    ? 'Crear carpeta'
    : step === 1 && method === 'ai'
      ? 'Preparar con Foxy'
      : step === 1 && method === 'classroom'
        ? 'Revisar mi recorrido'
        : step === 1 && method === 'manual'
          ? 'Armar mi recorrido'
          : 'Continuar';
  const status = operation
    ? {
      upload: 'Subiendo y validando el plan…',
      check: 'Consultando el estado del plan…',
      import: 'Copiando el plan del aula…',
      analyze: 'Organizando unidades y temas…',
      save: 'Guardando borrador…',
      create: 'Creando tu carpeta…',

    }[operation]
    : dirty
      ? 'Cambios sin guardar'
      : saved
        ? 'Borrador guardado'
        : 'La carpeta se activa sólo al confirmar.';
  return (renderStudyFolderShell({
step, blocked, heading, headingText: steps[step].heading, description: steps[step].description, error, leave, analyzing: operation === 'analyze', working: !!operation, status,
onClose: () => {
    if (!lock.current) {
      if (dirty)
        setLeave(!leave);
      else
        onClose();

    }

  }, onAdvance: advance, onResume: () => setLeave(false), onDiscard: onClose,
sidebar: renderStudyFolderSidebar({
          step,
          disabled: blocked || leave,
          banner,
          name,
          subject,
          goTo

        }),
content: step === 0 ? (renderStudyFolderIdentity({
                name,
                subject,
                year,
                banner,
                onName: value => {
                  setName(value);
                  setDirty(true);
                },
                onSubject: value => {
                  setSubject(value);
                  setDirty(true);
                },
                onYear: value => {
                  setYear(value);
                  setDirty(true);
                },
                onBanner: value => {
                  setBanner(value);
                  setDirty(true);
                }

              })) : step === 1 ? (renderStudyFolderProgram({
                origin: method === 'classroom' ? 'classroom' : method === 'ai' ? 'program' : method === 'manual' ? 'manual' : null,
                linked,
                classrooms: catalog.classrooms,
                planSource: {
                  file,
                  uploading: operation === 'upload' || operation === 'check',
                  disabled: blocked || leave,
                  fileUrl: id => `/api/v1/study-folders/${draft.current!.id}/uploads/${id}/file?mode=download`,
                  onFile: upload,
                  onError: setError,
                  onRefresh: checkFile,
                  onRemoveFile: () => {
                    fileVersion.current++;
                    setFile(null);
                    setPlanId(null);
                    setError('');
                    setDirty(true);
                  }

                },
                onOrigin: origin => {
                  setError('');
                  if (origin === 'classroom') {
                    setProgramSource('classroom');
                    setMethod('classroom');
                    if (!linked && openRooms.length === 1) setLinked(openRooms[0]!.id);
                  }
                  else {
                    setProgramSource('own');
                    setLinked('');
                    setMethod(origin === 'program' ? 'ai' : 'manual');
                  }
                  setDirty(true);
                },
                onClassroom: id => {
                  setLinked(id);
                  setMethod('classroom');
                  setDirty(true);
                },

              })) : step === 2 ? (renderStudyFolderCurriculum({
                method,
                analysisFailed,
                editUnits,
                onRetry: analyze,
                onManual: () => {
                  setMethod('manual');
                  setError('');
                },
                onUnits: (next) => {
                  setUnits(next.map((unit) => ({
                    id: unit.id ?? crypto.randomUUID(),
                    title: unit.name,
                    topics: unit.topics.map((topic) => ({
                      id: topic.id ?? crypto.randomUUID(),
                      title: topic.name,

                    })),

                  })));
                  setDirty(true);

                }

              })) : (renderStudyFolderReview({
                banner,
                subject,
                name,
                year,
                linked,
                classrooms: catalog.classrooms,
                units,
                goTo

              })),
footer: renderStudyFolderFooter({
        disabled: blocked || leave,
        advanceDisabled: blocked ||
          leave ||
          (step === 1 &&
            (!method || (method === 'classroom' && !linked) || (method === 'ai' && !file?.ready))) ||
          (step === 2 && method === 'ai' && analysisFailed),
        actionLabel: operation === 'create'
          ? 'Creando carpeta…'
          : operation === 'analyze'
            ? 'Analizando plan…'
            : action,
        hasPrevious: step > 0,
        onSave: () => save(false, true),
        onBack: () => goTo(step - 1)

      })
}));

}
