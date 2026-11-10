import type { Detail } from './classroom-port.ts';
import type { ConfirmFoxyPublication, FoxyPublicationConfirmation, FoxyPublicationInspection, FoxyVisualPublicationSummary, PrepareFoxyVisualPublication } from '../../../../../../src/core/domain/index.ts';
import type { WebFoxyClient } from '../api/foxy-client.ts';

export type FoxyVisualPublicationState = { assetId: string; assetRevision: string; classroomId: string; title: string;
  destination: Detail | null; unitId: string | null; topicId: string | null; publication: FoxyVisualPublicationSummary | null; inspection: FoxyPublicationInspection | null; reviewed: boolean; reviewReady: boolean;
  busy: boolean; pending: 'PREPARE' | 'CONFIRM' | null; error: string | null; receipt: FoxyPublicationConfirmation | null };
type Intent = { kind: 'PREPARE'; assetId: string; input: PrepareFoxyVisualPublication } | { kind: 'CONFIRM'; publicationId: string; input: ConfirmFoxyPublication };
type Options = { client: Pick<WebFoxyClient,'prepareVisualPublication'|'listVisualPublications'|'inspectPublication'|'confirmPublication'>;
  loadClassroom(id: string, signal: AbortSignal): Promise<Detail>; onChange(state: FoxyVisualPublicationState): void };
const initial = (): FoxyVisualPublicationState => ({ assetId:'',assetRevision:'',classroomId:'',title:'',destination:null,unitId:null,topicId:null,publication:null,inspection:null,reviewed:false,reviewReady:false,busy:false,pending:null,error:null,receipt:null });
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
  function validSelection(room: Detail, unit: string | null, topic: string | null) { if (!unit) return !topic; const units=room.units.filter(x => !!x.id && same(x.id,unit)); return units.length===1 && (!topic || units[0].topics.filter(x => !!x.id && same(x.id,topic)).length===1); }
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
        const p=result.publication; if (!visual(p) || !same(p.classroomId,value.input.classroomId) || p.title!==value.input.title || p.unitId!==value.input.unitId || p.topicId!==value.input.topicId) throw new Error('Invalid receipt');
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
        || actual.title!==state.title || actual.unitId!==state.unitId || actual.topicId!==state.topicId || !validSelection(room,state.unitId,state.topicId) || room.role!=='teacher' || room.archived || inspection.classroomArchived || !same(room.id,p.classroomId) || room.revision!==inspection.classroomRevision) throw new Error('Review unavailable');
      emit({busy:false,publication:actual,inspection,destination:room,reviewReady:true});
    } catch { if (current(v)) emit({busy:false,error:'No pudimos revisar la publicación.',reviewReady:false,reviewed:false}); }
  }
  return {
    getState: () => structuredClone(state),
    syncAsset(id: string,revision: string) { if (disposed || (same(id,state.assetId) && revision===state.assetRevision)) return; reset(); emit({...initial(),assetId:id,assetRevision:revision});
      if (!uuid(id)) return; const v=epoch;
      void options.client.listVisualPublications(id,{limit:20,afterId:null},abort.signal).then(page => {
        if (!current(v) || state.pending || state.busy || state.publication || state.title || state.classroomId) return;
        const p=page.items.find(item => visual(item) && item.state !== 'DISCARDED');
        if (p) { emit({publication:p,classroomId:p.classroomId,title:p.title,unitId:p.unitId,topicId:p.topicId}); void options.loadClassroom(p.classroomId,abort.signal).then(room => { if (current(v) && !state.busy && !state.reviewReady && same(room.id,p.classroomId) && room.role==='teacher' && !room.archived && validSelection(room,p.unitId,p.topicId)) emit({destination:room}); }).catch(() => {}); void refresh(); }
      }).catch(() => {});
    },
    async setClassroomId(id: string) { if (state.busy || state.pending || (id!=='' && !uuid(id)) || id===state.classroomId) return; reset(); emit({classroomId:id,destination:null,unitId:null,topicId:null,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null,error:null}); if (!id) return; const v=epoch; emit({busy:true}); try { const room=await options.loadClassroom(id,abort.signal); if (!current(v)) return; if (!same(room.id,id) || room.role!=='teacher' || room.archived) throw Error('Invalid classroom'); emit({destination:room,busy:false}); } catch { if (current(v)) emit({busy:false,error:'No pudimos cargar el aula.'}); } },
    selectUnit(id: string | null) { if (state.busy || state.pending) return; const room=state.destination; const selected=id && uuid(id) && room && room.units.filter(x=>!!x.id && same(x.id,id)).length===1 ? id : null; reset(); emit({unitId:selected,topicId:null,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null}); },
    selectTopic(id: string | null) { if (state.busy || state.pending) return; const selected=id && uuid(id) && state.destination && state.unitId && validSelection(state.destination,state.unitId,id) ? id : null; reset(); emit({topicId:selected,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null}); },
    setTitle(title: string) { if (!state.busy && !state.pending && title!==state.title) { reset(); emit({title,publication:null,inspection:null,reviewReady:false,reviewed:false,receipt:null}); } },
    prepare() { if (task) return task; if (!state.destination || !same(state.destination.id,state.classroomId) || !validSelection(state.destination,state.unitId,state.topicId) || !uuid(state.assetId) || !uuid(state.classroomId) || !/^(0|[1-9][0-9]*)$/u.test(state.assetRevision) || !state.title.trim() || [...state.title].length>200 || /[\u0000-\u001f\u007f-\u009f]/u.test(state.title) || state.pending) return;
      return run({kind:'PREPARE',assetId:state.assetId,input:{requestId:crypto.randomUUID(),assetRevision:state.assetRevision,classroomId:state.classroomId,title:state.title,unitId:state.unitId,topicId:state.topicId}}); },
    refresh, review, setReviewed(value: boolean) { if (!state.busy && !state.pending && state.reviewReady) emit({reviewed:value===true}); },
    confirm() { if (task) return task; const p=state.publication, i=state.inspection; if (!p || !i || !state.reviewReady || !state.reviewed || state.pending || state.receipt) return;
      return run({kind:'CONFIRM',publicationId:p.id,input:{requestId:crypto.randomUUID(),publicationRevision:p.revision,classroomRevision:i.classroomRevision,confirm:true}}); },
    retry() { if (!state.busy && intent) return run(intent); },
    dispose() { if (!disposed) { reset(); disposed=true; state=initial(); } },
  };
}
export type FoxyVisualPublicationActions = ReturnType<typeof createFoxyVisualPublicationController>;
