import type { ClassroomClient } from '../../../src/core/contracts/academic-client.ts';
import type { Draft, Payload } from '../../../src/core/contracts/classrooms.ts';
import type { FileState } from '../../../src/core/contracts/materials.ts';
import type { ExtractionView, CurriculumUnit } from '../../../src/core/domain/index';

export const draftId = '11111111-1111-4111-8111-111111111111';
const fileId = '22222222-2222-4222-8222-222222222222', jobId = '33333333-3333-4333-8333-333333333333';
const publishedId = '44444444-4444-4444-8444-444444444444';
const units: CurriculumUnit[] = [
  { name: 'Los seres vivos', topics: [{ name: 'Características de la vida' }, { name: 'La célula y sus funciones' }] },
  { name: 'Ecosistemas y biodiversidad', topics: [{ name: 'Relaciones entre seres vivos' }, { name: 'Cuidado del ambiente' }] },
];
export function initialDraft(mode: string): Draft {
  const payload: Payload = { name: 'Biología — Exploración', subject: 'Biología', division: '5.º A', academicYear: 2026,
    timezone: 'America/Argentina/Buenos_Aires', coverKey: 'biology', units: structuredClone(units) };
  if (!['upload', 'pending', 'rejected', 'upload-busy', 'blank'].includes(mode)) payload.planFileId = fileId;
  if (mode === 'blank') return { id: draftId, revision: '1', payload: { timezone: payload.timezone }, publishedClassroomId: null };
  if (mode === 'long') { payload.name = 'Biología y ciencias naturales: investigación de nuestra comunidad y sus transformaciones'; payload.units = units.map(unit => ({ ...unit, name: `${unit.name}: análisis y exploración interdisciplinaria` })); }
  return { id: draftId, revision: '1', payload, publishedClassroomId: null };
}
export interface Receipt { path: string; method: string; revision?: string; synthetic: true }
const approvedFile = (): FileState => ({ id: fileId, name: 'plan-biologia-fixture.pdf', ready: true,
  upload: 'COMPLETE', validation: 'APPROVED', scan: 'CLEAN', rejectionCode: null });

/** Fixture-only effects: memory state, no fetch/provider/database. Specific routes precede drafts. */
export function wizardFixture(mode: string, record: (entry: Receipt) => void) {
  let draft = initialDraft(mode), file = approvedFile(), polls = 0, publishFailed = false;
  const extraction = (state: ExtractionView['state']): ExtractionView => ({ id: jobId, draftId, planFileId: fileId,
    baseRevision: draft.revision, state, proposal: state === 'READY' ? { units: structuredClone(units), warnings: [] } : null,
    error: state === 'FAILED' ? 'AI_UNAVAILABLE' : null, retryable: state === 'FAILED' });
  const bump = (payload: Payload) => { draft = { ...draft, payload: structuredClone(payload), revision: String(Number(draft.revision) + 1) }; return structuredClone(draft); };
  const call: ClassroomClient['call'] = async <T,>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    const command = body as { revision?: string; payload?: Payload; units?: CurriculumUnit[] } | undefined;
    record({ path, method, revision: command?.revision, synthetic: true });
    let result: unknown;
    if (path === `/${publishedId}/library`) result = [];
    else if (path === `/${publishedId}/activities`) result = { activities: [] };
    else if (path === `/drafts/${draftId}/curriculum-extractions`) {
      result = extraction(mode === 'proposal' ? 'READY' : mode === 'running' ? 'QUEUED' : mode === 'stale' ? 'STALE' : 'FAILED');
    } else if (path === `/drafts/${draftId}/curriculum-extractions/${jobId}/apply`) {
      if (command?.revision !== draft.revision) throw Object.assign(new Error('Conflicto sintético al aplicar.'), { code: 'CONFLICT' });
      const saved = bump({ ...draft.payload, units: command.units });
      result = { extractionId: jobId, appliedRevision: saved.revision, draft: saved };
    } else if (path === `/drafts/${draftId}/curriculum-extractions/${jobId}/retry`) result = extraction('READY');
    else if (path === `/drafts/${draftId}/curriculum-extractions/${jobId}`) result = extraction(++polls >= 2 ? 'READY' : 'RUNNING');
    else if (path === `/drafts/${draftId}/publish` && method === 'POST') {
      if (mode === 'publish-busy') await new Promise(resolve => setTimeout(resolve, 2500));
      if (mode === 'publish-error' && !publishFailed) { publishFailed = true; throw new Error('Publicación sintética no disponible. Podés volver a intentar.'); }
      if (command?.revision !== draft.revision) throw Object.assign(new Error('Revisión sintética incompatible.'), { code: 'CONFLICT' });
      draft.publishedClassroomId = publishedId; result = { id: publishedId, code: 'SYNTHETIC-CLASS' };
    } else if (path === `/drafts/${draftId}`) {
      if (method === 'PATCH') {
        if (mode === 'save-busy') await new Promise(resolve => setTimeout(resolve, 2000));
        if (mode === 'conflict' || mode === 'save-error') throw Object.assign(new Error('El borrador sintético cambió. Volvé a abrirlo.'), { code: mode === 'conflict' ? 'CONFLICT' : 'SERVICE_UNAVAILABLE' });
        if (command?.revision !== draft.revision || !command.payload) throw Object.assign(new Error('Revisión sintética incompatible.'), { code: 'CONFLICT' });
        result = bump(command.payload);
      } else if (method === 'GET') result = draft;
      else throw new Error('Método no habilitado en la fixture.');
    } else throw new Error('Ruta fuera de la fixture de Crear aula.');
    return structuredClone(result) as T;
  };
  const api: ClassroomClient = { call, upload: async (_id, chosen) => {
    record({ path: '/fixture/upload', method: 'POST', synthetic: true });
    if (mode === 'upload-busy') await new Promise(resolve => setTimeout(resolve, 2500));
    if (!/\.(pdf|docx)$/i.test(chosen.name) || chosen.size > 20_000_000) throw new Error('Fixture: elegí PDF o DOCX de hasta 20 MB.');
    file = { ...approvedFile(), name: chosen.name };
    if (mode === 'pending') file = { ...file, ready: false, validation: 'PENDING', scan: 'PENDING' };
    if (mode === 'rejected') file = { ...file, ready: false, validation: 'REJECTED', scan: 'REJECTED', rejectionCode: 'FILE_REJECTED' };
    return structuredClone(file);
  }, fileStatus: async () => { record({ path: '/fixture/file-status', method: 'GET', synthetic: true }); return structuredClone(file); },
    fileUrl: () => '/wizard-reference-fixtures/plan.pdf' };
  return { api, initial: structuredClone(draft), snapshot: () => structuredClone(draft) };
}
