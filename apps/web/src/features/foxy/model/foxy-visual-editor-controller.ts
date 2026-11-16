import type { FoxyPrivateAssetInspection } from '../../../../../../src/core/domain/index.ts';
import type { WebFoxyClient } from '../api/foxy-client.ts';

type Draft = { title: string; description: string };
type Intent = Draft & { expectedRevision: string; requestId: string };
export type FoxyVisualEditorState = { assetId: string; inspection: FoxyPrivateAssetInspection | null; draft: Draft | null;
  loading: boolean; busy: boolean; pending: Intent | null; dirty: boolean; conflict: boolean; error: string | null };
const initial = (): FoxyVisualEditorState => ({assetId:'',inspection:null,draft:null,loading:false,busy:false,pending:null,dirty:false,conflict:false,error:null});
const text = (info: FoxyPrivateAssetInspection): Draft => ({title:info.editorial?.title ?? info.payload?.title ?? '',description:info.editorial?.description ?? info.payload?.description ?? ''});
export function validVisualEditorial(draft: Draft) {
  return !!draft.title.trim() && [...draft.title].length <= 200 && !/[\u0000-\u001f\u007f-\u009f]/u.test(draft.title)
    && [...draft.description].length <= 12000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(draft.description);
}
export function createFoxyVisualEditorController(options: {client: Pick<WebFoxyClient,'inspectAsset'|'updateVisualEditorial'>;onChange(state:FoxyVisualEditorState):void}) {
  let state=initial(), epoch=0, readVersion=0, disposed=false, abort=new AbortController();
  const current=(version:number)=>!disposed&&version===epoch&&!abort.signal.aborted;
  const emit=(patch:Partial<FoxyVisualEditorState>)=>{if(!disposed){state={...state,...patch};options.onChange(structuredClone(state));}};
  const available=(info:FoxyPrivateAssetInspection)=>info.asset.id===state.assetId&&info.asset.state==='READY'&&info.canPreview&&!!info.payload;
  const revoke=()=>emit({inspection:null,draft:null,dirty:false,conflict:false,pending:null,busy:false,loading:false,error:'Esta creación ya no está disponible.'});
  async function refresh(keepDraft=false) {
    if(!state.assetId||state.busy||state.pending||disposed)return;
    const version=epoch,read=++readVersion;emit({loading:true,error:null});
    try{const info=await options.client.inspectAsset(state.assetId,abort.signal);if(!current(version)||read!==readVersion)return;
      if(!available(info)){revoke();return;}
      const draft=keepDraft&&state.draft?state.draft:text(info), saved=text(info);
      emit({inspection:info,draft,loading:false,dirty:draft.title!==saved.title||draft.description!==saved.description});
    }catch(error){if(!current(version)||read!==readVersion)return;const code=(error as {code?:string}).code;
      if(['FORBIDDEN','NOT_FOUND','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(code??''))revoke();
      else emit({loading:false,inspection:null,error:'No pudimos abrir la creación. Volvé a intentar.'});}
  }
  function updateDraft(draft:Draft){if(state.busy||state.pending||!state.inspection?.canEdit)return;const saved=text(state.inspection);emit({draft,dirty:draft.title!==saved.title||draft.description!==saved.description,error:null});}
  async function dispatch(input:Intent) {
    if(state.busy||disposed)return false;const version=epoch;emit({busy:true,pending:input,error:null});
    try{const info=await options.client.updateVisualEditorial(state.assetId,input,abort.signal);if(!current(version))return false;
      if(!available(info)){revoke();return false;}
      emit({inspection:info,draft:text(info),dirty:false,conflict:false,busy:false,pending:null});return true;
    }catch(error){if(!current(version))return false;const code=(error as {code?:string}).code;
      if(['FORBIDDEN','NOT_FOUND','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(code??'')){revoke();return false;}
      if(code==='CONFLICT'){emit({busy:false,pending:null,conflict:true});await refresh(true);if(current(version)&&state.inspection)emit({error:'La creación cambió en otra sesión. Elegí qué versión conservar.'});}
      else if(['INVALID_INPUT','CSRF_INVALID','ORIGIN_NOT_ALLOWED'].includes(code??''))emit({busy:false,pending:null,error:'No pudimos guardar. Revisá el título y el contenido.'});
      else emit({busy:false,error:'No pudimos confirmar el guardado. Tus cambios siguen acá; reintentá para consultar el resultado.'});
      return false;
    }
  }
  return {getState:()=>structuredClone(state),
    syncAsset(id:string){if(disposed||id===state.assetId)return;epoch++;abort.abort();abort=new AbortController();emit({...initial(),assetId:id});if(id)void refresh();},
    refresh:()=>refresh(!!state.draft&&state.dirty),updateDraft,
    restore(){const original=state.inspection?.payload;if(original)updateDraft({title:original.title,description:original.description??''});},
    discard(){if(state.busy)return;const draft=state.inspection?text(state.inspection):null;emit({draft,dirty:false,pending:null,conflict:false,error:null});},
    resolveConflict(keepLocal:boolean){if(!state.conflict||!state.inspection||state.loading)return;if(!keepLocal){const draft=text(state.inspection);emit({draft,dirty:false});}emit({conflict:false,error:null});},
    save(){if(state.busy||state.pending||state.conflict||state.loading||!state.draft||!state.inspection?.canEdit||!validVisualEditorial(state.draft))return Promise.resolve(false);
      return dispatch({...state.draft,expectedRevision:state.inspection.editorial?.revision??'0',requestId:crypto.randomUUID()});},
    retry(){return state.pending&&!state.busy?dispatch(state.pending):Promise.resolve(false);},
    dispose(){if(disposed)return;disposed=true;epoch++;abort.abort();state=initial();},
  };
}
