import type { FoxyAspectRatio, FoxyVisualKind, StartFoxyVisual } from '../../../../../../src/core/domain/foxy/visual.ts';
import type { FoxySelection } from '../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { FoxyConversation, FoxyVisualJob, WebFoxyClient } from '../api/foxy-client.ts';
type State = { kind: FoxyVisualKind; prompt: string; aspectRatio: FoxyAspectRatio; jobs: FoxyVisualJob[]; selectedId: string | null;
  busy: boolean; pending: StartFoxyVisual | null; error: string | null };
type Options = { client: Pick<WebFoxyClient,'startVisual'|'listVisuals'|'getVisual'|'cancelVisual'>; onChange(state: State): void;
  current(): { conversation: FoxyConversation | null; selection: FoxySelection; canGenerate: boolean; busy: boolean; enabled: Record<FoxyVisualKind, boolean> }; onRevision(id: string, expected: string, revision: string): void };
export function createFoxyVisualController(options: Options) {
  let state: State = { kind:'IMAGE',prompt:'',aspectRatio:'1:1',jobs:[],selectedId:null,busy:false,pending:null,error:null };
  let conversationId: string | null = null, epoch = 0, listVersion = 0, disposed = false, abort = new AbortController(), timer: ReturnType<typeof setTimeout> | undefined;
  const update = (patch: Partial<State>) => { if (!disposed) { state={...state,...patch}; options.onChange(structuredClone(state)); } };
  const valid = (version: number) => !disposed && epoch===version && !abort.signal.aborted;
  function reset(id: string | null) { epoch++; abort.abort(); abort=new AbortController(); if (timer) clearTimeout(timer); timer=undefined; conversationId=id;
    update({jobs:[],selectedId:null,busy:false,pending:null,error:null}); }
  function poll(version: number) {
    if (!valid(version) || timer || !conversationId || !state.jobs.some(job => job.state==='QUEUED' || job.state==='RUNNING')) return;
    timer=setTimeout(() => { timer=undefined; void refresh(); },2000);
  }
  async function refresh() {
    const id=conversationId, version=epoch; if (!id || !valid(version) || state.busy || state.pending) return;
    const list=++listVersion;
    try {
      const result=await options.client.listVisuals(id,{limit:50,afterId:null},abort.signal); if (!valid(version) || list!==listVersion) return;
      let jobs=result.items.filter(job=>job.conversationId===id);
      const selected = state.selectedId;
      if (selected && !jobs.some(job => job.id === selected)) {
        try {
          const focused = await options.client.getVisual(id, selected, abort.signal);
          if (focused.id === selected && focused.conversationId === id && focused.state === 'READY') jobs = [focused, ...jobs];
        } catch (error) { if (!['NOT_FOUND', 'FORBIDDEN'].includes((error as { code?: string }).code ?? '')) throw error; }
      }
      if (!valid(version) || list!==listVersion) return;
      update({jobs,selectedId:jobs.some(j=>j.id===state.selectedId) ? state.selectedId : jobs[0]?.id ?? null}); poll(version);
    } catch { if (valid(version) && list===listVersion) update({error:'No pudimos actualizar los recursos visuales.'}); }
  }
  async function dispatch(input: StartFoxyVisual) {
    const id=conversationId, version=epoch; if (!id || state.busy || !valid(version)) return;
    update({busy:true,pending:input,error:null});
    try {
      const receipt=await options.client.startVisual(id,input,abort.signal); if (!valid(version)) return;
      options.onRevision(id,input.revision,receipt.conversationRevision);
      listVersion++;
      update({busy:false,pending:null,jobs:[receipt.job,...state.jobs.filter(job=>job.id!==receipt.job.id)],selectedId:receipt.job.id,prompt:state.prompt===input.prompt ? '' : state.prompt}); poll(version);
    } catch (error) {
      if (!valid(version)) return;
      const code=(error as {code?:string}).code;
      if (['INVALID_INPUT','AI_INPUT_LIMIT','EMPTY_CONTENT','CONFLICT','QUOTA_EXCEEDED','AI_UNAVAILABLE','FORBIDDEN','NOT_FOUND'].includes(code ?? ''))
        update({busy:false,pending:null,error: code==='QUOTA_EXCEEDED' ? 'No hay espacio disponible para otro recurso visual.' : 'No pudimos generar el recurso. Revisá el contexto e intentá de nuevo.'});
      else update({busy:false,error:'No pudimos confirmar la solicitud. Podés reintentarla.'});
    }
  }
  return {
    getState: () => structuredClone(state),
    syncContext() { const current=options.current().conversation?.id ?? null; if (current!==conversationId) { reset(current); if (current) void refresh(); } },
    setKind(kind: FoxyVisualKind) { if (!state.busy && (kind==='IMAGE'||kind==='DIAGRAM')) update({kind}); },
    setPrompt(prompt: string) { if (!state.busy) update({prompt}); },
    setAspectRatio(aspectRatio: FoxyAspectRatio) { if (!state.busy && ['1:1','4:3','3:4','16:9'].includes(aspectRatio)) update({aspectRatio}); },
    select(id: string) { if (state.jobs.some(job=>job.id===id)) update({selectedId:id}); }, refresh,
    async openJob(jobId: string) {
      const id = conversationId, version = epoch;
      if (!id || !valid(version) || state.pending || state.busy) return false;
      const list = ++listVersion; update({ busy: true, error: null });
      try {
        const job = await options.client.getVisual(id, jobId, abort.signal);
        if (!valid(version) || list !== listVersion) return false;
        if (job.id !== jobId || job.conversationId !== id || job.state !== 'READY') throw new Error('Visual unavailable');
        update({ jobs: [job, ...state.jobs.filter(item => item.id !== job.id)], selectedId: job.id, kind: job.kind, busy: false }); poll(version); return true;
      } catch { if (valid(version) && list === listVersion) { update({ busy: false, error: 'No pudimos abrir el recurso visual. Actualizá Creaciones y volvé a intentar.' }); poll(version); } return false; }
    },
    async cancel(jobId: string) {
      const id=conversationId, version=epoch;
      if (!id || state.busy || !state.jobs.some(job => job.id===jobId && (job.state==='QUEUED' || job.state==='RUNNING'))) return;
      listVersion++; update({busy:true,error:null});
      try {
        const job=await options.client.cancelVisual(id,jobId,abort.signal);
        if (valid(version)) update({jobs:state.jobs.map(item=>item.id===job.id?job:item),busy:false});
      } catch {
        if (valid(version)) update({busy:false,error:'No pudimos detener el recurso. Volvé a intentar.'});
      } finally { if (valid(version)) poll(version); }
    },
    start(selection?: FoxySelection) { const current=options.current(); if (!current.conversation || current.busy || !current.canGenerate || !current.enabled[state.kind] || state.pending || state.busy || !state.prompt.trim() || [...state.prompt].length>5000) return;
      const input: StartFoxyVisual={requestId:crypto.randomUUID(),revision:current.conversation.revision,kind:state.kind,prompt:state.prompt,
        selection:current.conversation.context.kind==='GENERAL'?{topicIds:[],sourceIds:[]}:structuredClone(selection??current.selection),aspectRatio:state.aspectRatio}; return dispatch(input); },
    retry() { if (state.pending) return dispatch(state.pending); },
    dispose() { if (disposed) return; disposed=true; abort.abort(); if (timer) clearTimeout(timer); },
  };
}
