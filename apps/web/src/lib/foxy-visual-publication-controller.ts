import type { Detail } from '../../../classrooms-ui/api.ts';
import type { ConfirmFoxyPublication, FoxyPublicationConfirmation, FoxyPublicationInspection, FoxyVisualPublicationSummary, PrepareFoxyVisualPublication } from '../../../../src/core/domain/index.ts';
import type { WebFoxyClient } from './foxy-client.ts';

export type FoxyVisualPublicationState = { assetId: string; assetRevision: string; classroomId: string; title: string;
  publication: FoxyVisualPublicationSummary | null; inspection: FoxyPublicationInspection | null; reviewed: boolean; reviewReady: boolean;
  busy: boolean; pending: 'PREPARE' | 'CONFIRM' | null; error: string | null; receipt: FoxyPublicationConfirmation | null };
type Intent = { kind: 'PREPARE'; assetId: string; input: PrepareFoxyVisualPublication } | { kind: 'CONFIRM'; publicationId: string; input: ConfirmFoxyPublication };
type Options = { client: Pick<WebFoxyClient,'prepareVisualPublication'|'listVisualPublications'|'inspectPublication'|'confirmPublication'>;
  loadClassroom(id: string, signal: AbortSignal): Promise<Detail>; onChange(state: FoxyVisualPublicationState): void };
const initial = (): FoxyVisualPublicationState => ({ assetId:'',assetRevision:'',classroomId:'',title:'',publication:null,inspection:null,reviewed:false,reviewReady:false,busy:false,pending:null,error:null,receipt:null });
const same = (a: string,b: string) => a.toLowerCase() === b.toLowerCase();
const uuid = (v: string) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(v);
export function createFoxyVisualPublicationController(options: Options) {
  let state = initial(), epoch = 0, disposed = false, abort = new AbortController(), intent: Intent | null = null, task: Promise<unknown> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const current = (v: number) => !disposed && epoch === v && !abort.signal.aborted;
  const emit = (patch: Partial<FoxyVisualPublicationState>) => { if (!disposed) { state={...state,...patch}; options.onChange(structuredClone(state)); } };
  function reset() { epoch++; abort.abort(); abort=new AbortController(); if (timer) clearTimeout(timer); timer=undefined; intent=null; task=null; }
  function poll() { if (timer || state.publication?.state !== 'PREPARING') return; timer=setTimeout(() => { timer=undefined; void refresh(); },2000); }
  function visual(p: FoxyPublicationInspection['publication']): p is FoxyVisualPublicationSummary {
    return 'sourceKind' in p && p.sourceKind === 'VISUAL' && same(p.assetId,state.assetId) && p.assetRevision === state.assetRevision;
  }
  async function refresh() {
    const pub=state.publication, v=epoch; if (!pub || state.busy || state.pending) return;
    try { const result=await options.client.inspectPublication(pub.id,abort.signal); if (!current(v)) return;
      if (!visual(result.publication) || !same(result.publication.id,pub.id) || !same(result.publication.classroomId,pub.classroomId)) throw new Error('Invalid publication');
      const known=state.publication;
      if (!known || !same(known.id,pub.id) || BigInt(result.publication.revision)<BigInt(known.revision)
        || (['DISCARDED','PUBLISHED'].includes(known.state) && known.state!==result.publication.state)) return;
      emit({publication:result.publication,inspection:result,reviewReady:false,reviewed:false,error:null}); poll();
    } catch { if (current(v)) emit({error:'No pudimos actualizar la preparación.',reviewReady:false,reviewed:false}); }
  }
  async function dispatch(value: Intent) {
    const v=epoch; intent=structuredClone(value); emit({busy:true,pending:value.kind,error:null});
    try {
      if (value.kind === 'PREPARE') {
        const result=await options.client.prepareVisualPublication(value.assetId,value.input,abort.signal); if (!current(v)) return;
        const p=result.publication; if (!visual(p) || !same(p.classroomId,value.input.classroomId) || p.title!==value.input.title) throw new Error('Invalid receipt');
        intent=null; emit({busy:false,pending:null,publication:p,inspection:null,reviewReady:false,reviewed:false}); await refresh(); return;
      }
      const result=await options.client.confirmPublication(value.publicationId,value.input,abort.signal); if (!current(v)) return;
      if (!same(result.publicationId,value.publicationId) || !uuid(result.materialId) || BigInt(result.publicationRevision)!==BigInt(value.input.publicationRevision)+1n || BigInt(result.classroomRevision)!==BigInt(value.input.classroomRevision)+1n) throw new Error('Invalid receipt');
      intent=null; emit({busy:false,pending:null,receipt:result});
    } catch (error) { if (!current(v)) return; const e=error as {code?:string;status?:number};
      if (e.status===400 || e.status===409 || ['INVALID_INPUT','CONFLICT','FORBIDDEN','NOT_FOUND','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','CSRF_INVALID','ORIGIN_NOT_ALLOWED'].includes(e.code ?? '')) {
        intent=null; emit({busy:false,pending:null,reviewReady:false,reviewed:false,error:'No pudimos completar la solicitud. Revisá el recurso y el aula.'});
      } else emit({busy:false,error:'No pudimos confirmar la solicitud. Podés reintentarla.'});
    }
  }
  function run(value: Intent) { if (task) return task; const running=dispatch(value); task=running; void running.finally(() => { if (task===running) task=null; }); return running; }
  async function review() {
    const p=state.publication, v=epoch; if (!p || state.busy || state.pending || p.state!=='READY') return;
    emit({busy:true,reviewReady:false,reviewed:false,error:null});
    try { const [inspection,room]=await Promise.all([options.client.inspectPublication(p.id,abort.signal),options.loadClassroom(p.classroomId,abort.signal)]);
      if (!current(v)) return; const actual=inspection.publication;
      if (!visual(actual) || !same(actual.id,p.id) || actual.revision!==p.revision || actual.state!=='READY' || !same(actual.classroomId,p.classroomId)
        || room.role!=='teacher' || room.archived || inspection.classroomArchived || !same(room.id,p.classroomId) || room.revision!==inspection.classroomRevision) throw new Error('Review unavailable');
      emit({busy:false,publication:actual,inspection,reviewReady:true});
    } catch { if (current(v)) emit({busy:false,error:'No pudimos revisar la publicación.',reviewReady:false,reviewed:false}); }
  }
  return {
    getState: () => structuredClone(state),
    syncAsset(id: string,revision: string) { if (disposed || (same(id,state.assetId) && revision===state.assetRevision)) return; reset(); emit({...initial(),assetId:id,assetRevision:revision});
      if (!uuid(id)) return; const v=epoch;
      void options.client.listVisualPublications(id,{limit:20,afterId:null},abort.signal).then(page => {
        if (!current(v) || state.pending || state.busy || state.publication || state.title || state.classroomId) return;
        const p=page.items.find(item => visual(item) && item.state !== 'DISCARDED');
        if (p) { emit({publication:p,classroomId:p.classroomId,title:p.title}); void refresh(); }
      }).catch(() => {});
    },
    setClassroomId(id: string) { if (!state.busy && !state.pending && (id==='' || uuid(id)) && id!==state.classroomId) { reset(); emit({classroomId:id,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null}); } },
    setTitle(title: string) { if (!state.busy && !state.pending && title!==state.title) { reset(); emit({title,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null}); } },
    prepare() { if (task) return task; if (!uuid(state.assetId) || !uuid(state.classroomId) || !/^(0|[1-9][0-9]*)$/u.test(state.assetRevision) || !state.title.trim() || [...state.title].length>200 || /[\u0000-\u001f\u007f-\u009f]/u.test(state.title) || state.pending) return;
      return run({kind:'PREPARE',assetId:state.assetId,input:{requestId:crypto.randomUUID(),assetRevision:state.assetRevision,classroomId:state.classroomId,title:state.title,unitId:null,topicId:null}}); },
    refresh, review, setReviewed(value: boolean) { if (!state.busy && !state.pending && state.reviewReady) emit({reviewed:value===true}); },
    confirm() { if (task) return task; const p=state.publication, i=state.inspection; if (!p || !i || !state.reviewReady || !state.reviewed || state.pending || state.receipt) return;
      return run({kind:'CONFIRM',publicationId:p.id,input:{requestId:crypto.randomUUID(),publicationRevision:p.revision,classroomRevision:i.classroomRevision,confirm:true}}); },
    retry() { if (!state.busy && intent) return run(intent); },
    dispose() { if (!disposed) { reset(); disposed=true; state=initial(); } },
  };
}
export type FoxyVisualPublicationActions = ReturnType<typeof createFoxyVisualPublicationController>;
