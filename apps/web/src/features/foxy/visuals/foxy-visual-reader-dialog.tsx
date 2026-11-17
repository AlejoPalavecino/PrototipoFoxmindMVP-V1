import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {openDialog} from '../../../../../shared-ui/dialog-focus';
import {downloadPlainText} from '../../../../../shared-ui/text-document';
import {FoxmindIcon} from '../../../../../shared-ui/FoxmindIcon';
import {FoxyVisualReader,visualReaderPreview} from './foxy-visual-reader';
import {validVisualEditorial,type createFoxyVisualEditorController,type FoxyVisualEditorState} from './foxy-visual-editor-controller';

type Props={assetId:string;state:FoxyVisualEditorState;actions:ReturnType<typeof createFoxyVisualEditorController>;
  assetFileUrl(id:string,mode:'preview'|'download'):string;onClose():void;sharing:ReactNode;sharingTitle?:string;shareLocked?:boolean;sharePending?:boolean;published?:boolean};
export function FoxyVisualReaderDialog(props:Props){
  const {state,actions}=props,ref=useRef<HTMLDialogElement>(null);
  const [mode,setMode]=useState<'read'|'edit'|'share'|'discard'|'pending'>(state.dirty||state.pending?'edit':props.sharePending?'share':'read');
  const [exit,setExit]=useState(false),[notice,setNotice]=useState('');
  const locked=state.busy||!!props.shareLocked;
  const info=state.assetId===props.assetId?state.inspection:null;
  const visible=!!visualReaderPreview({...props,inspection:info,loading:state.loading,error:null});
  const draft=visible?state.draft:null;
  const leave=(close:boolean)=>{
    if(locked)return;
    if(state.pending||props.sharePending){setExit(close);setMode('pending');return;}
    if(state.dirty){setExit(close);setMode('discard');return;}
    if(close)props.onClose();else setMode('read');
  };
  useEffect(()=>{if(ref.current)return openDialog(ref.current);},[]);
  useEffect(()=>{if(!state.dirty&&!state.pending&&!state.loading)void actions.refresh();},[props.assetId,actions]);
  useEffect(()=>{const dialog=ref.current;if(mode==='edit')dialog?.querySelector<HTMLInputElement>('input')?.focus();else dialog?.querySelector<HTMLHeadingElement>('h2')?.focus();},[mode]);
  useEffect(()=>{if(state.conflict)setMode('edit');},[state.conflict]);
  const save=async()=>{if(await(state.pending?actions.retry():actions.save())){setMode('read');setNotice('Guardaste tu creación.');}};
  const heading=mode==='edit'?'Dale tu mirada':mode==='share'?'Directo a tu Biblioteca':mode==='discard'?'¿Descartás tus cambios?':'Antes de salir';
  const subtitle=mode==='edit'?'Los cambios quedan en tu creación privada.':mode==='share'?'Revisá el destino. No necesitás descargar ni volver a subir el archivo.':mode==='discard'?'La versión guardada se conserva.':'La solicitud puede haberse completado.';
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="foxy-visual-reader-title" className={`p5-dialog parity-foxy-dialog parity-foxy-readingDialog parity-foxy-visualReader ${mode==='discard'?'parity-foxy-discardDialog':''}`}
    onCancel={event=>{event.preventDefault();if(mode==='discard')setMode('edit');else if(mode==='pending')setMode(state.pending?'edit':'share');else leave(true);}}>
    {mode==='read'||!visible?<FoxyVisualReader assetId={props.assetId} inspection={info} loading={state.loading} error={state.error} assetFileUrl={props.assetFileUrl}
      onClose={()=>leave(true)} onRetry={()=>void actions.refresh()} onEdit={()=>{setNotice('');setMode('edit');}} onShare={()=>{setNotice('');setMode('share');}} published={props.published} locked={locked||!!state.pending} editLocked={!!props.sharePending}
      onDownload={content=>downloadPlainText(info?.editorial?.title??info?.payload?.title??'Creación',content)}/>:<>
      <header><div><h2 id="foxy-visual-reader-title" tabIndex={-1}>{heading}</h2><p>{subtitle}</p></div><button type="button" className="p5-close" disabled={locked} aria-label="Cerrar diálogo" onClick={()=>leave(true)}><FoxmindIcon name="close"/></button></header>
      <div className="brujula-dialog-body">
        {mode==='edit'&&draft&&<form id="foxy-visual-edit" className="parity-foxy-editor" onSubmit={event=>{event.preventDefault();void save();}}>
          <label htmlFor="foxy-visual-title">Título</label><input id="foxy-visual-title" maxLength={200} required value={draft.title} disabled={locked||!!state.pending} onChange={event=>actions.updateDraft({...draft,title:event.currentTarget.value})}/>
          <label htmlFor="foxy-visual-content">Contenido</label><textarea id="foxy-visual-content" maxLength={12000} rows={10} value={draft.description} disabled={locked||!!state.pending} onChange={event=>actions.updateDraft({...draft,description:event.currentTarget.value})}/>
          <button type="button" disabled={locked||!!state.pending} onClick={()=>{actions.restore();setNotice('Restauraste el texto original en el editor. Guardá los cambios para conservarlo.');}}>Restaurar generación</button>
          {state.error&&<p role="alert">{state.error}</p>}
          {state.conflict&&<section aria-label="Conflicto de edición"><p>Versión guardada: {info?.editorial?.title??info?.payload?.title}</p><p className="parity-foxy-visualText">{info?.editorial?.description??info?.payload?.description}</p><button type="button" onClick={()=>actions.resolveConflict(true)}>Conservar mis cambios</button><button type="button" onClick={()=>actions.resolveConflict(false)}>Usar versión guardada</button></section>}
        </form>}
        {mode==='share'&&<><div className="parity-foxy-scopeBanner"><FoxmindIcon name="file"/><div><strong>{props.sharingTitle??info?.editorial?.title??info?.payload?.title}</strong><p>Se comparte una copia de la versión preparada.</p></div></div>{props.sharing}</>}
        {mode==='discard'&&<p>Podés volver al editor y seguir con tu idea.</p>}
        {mode==='pending'&&<p>Podés reintentar la misma solicitud para consultar el resultado. Tu creación guardada se conserva.</p>}
      </div>
      <footer className="parity-foxy-dialogFooter">
        {mode==='edit'?<><button type="button" disabled={locked} onClick={()=>leave(false)}>Cancelar</button><button type="submit" form="foxy-visual-edit" className="p5-primary" disabled={locked||state.loading||state.conflict||!draft||!validVisualEditorial(draft)}>{state.busy?'Guardando…':state.pending?'Reintentar guardado':'Guardar cambios'}</button></>
          :mode==='share'?<button type="button" disabled={locked} onClick={()=>leave(false)}>Volver a la creación</button>
          :mode==='discard'?<><button type="button" onClick={()=>setMode('edit')}>Seguir editando</button><button type="button" className="parity-foxy-danger" onClick={()=>{actions.discard();if(exit)props.onClose();else setMode('read');}}>Descartar</button></>
          :<><button type="button" onClick={()=>setMode(state.pending?'edit':'share')}>Seguir acá</button><button type="button" onClick={()=>props.onClose()}>Cerrar vista y continuar</button></>}
      </footer>
    </>}
    {notice&&<p className="parity-foxy-saveNotice" role="status">{notice}</p>}
  </dialog>;
}
