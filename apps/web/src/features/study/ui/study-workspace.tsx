import { ChatByline, FoxyChatLayout, FoxyDialog, type ChatIdentity, type ChatView } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentButton, ChatAttachmentList } from '../../../../../shared-ui/ChatAttachmentControls';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { useChatAttachments } from '../../../shared/use-chat-attachments';
import { studentAttachmentPath } from '../../../shared/chat-attachments';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';

import { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import {Fragment,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Dialog,Notice} from '../../../../../shared-ui/feedback';
import {createStudyClient,studyGenerationData,studyGenerationIssue,type StudyDetail,type StudyCollection,type StudyCreation} from '../api/study-client';
import { StudyLibrary } from './study-library';
import { StudyContext } from './study-context';
import {StudyGenerationStatus} from './study-generation-status';
import {useStudyGeneration} from '../model/use-study-generation';
import {studyGenerationResult,type StudyGenerationInput} from '../model/study-generation';
import { StudyConfirmation } from './study-confirmation';
import {FoxyMarkdown} from '../../../../../shared-ui/markdown';
import {downloadPlainText} from '../../../../../shared-ui/text-document';
import {StudyPracticeView,StudyExamPlanner} from './study-practice';
import s from './study.module.css';
import {filterStudyCreations,startStudyConversation,studyInitialPreferences} from '../model/study-discovery';
type Run=(action:string,data?:Record<string,unknown>,requestId?:string)=>Promise<unknown>;
export function StudyWorkspace({identity,detail,catalog,busy,run,onReload,examId,cancelGeneration,selectedConversationId,onConversationSelect}:{identity?:ChatIdentity;examId?:string;selectedConversationId?:string;onConversationSelect?:(id:string)=>void;cancelGeneration?:(requestId:string)=>Promise<'CANCELLED'|'ALREADY_FINISHED'>;detail:StudyDetail;catalog:StudyCollection;busy:boolean;run:Run;onReload:()=>Promise<void>}){const f=detail.folder;const initialPreferences=studyInitialPreferences(detail.memory,f.units.flatMap(u=>u.topics.map(t=>t.id)));const[pending,Pending]=useState<string|null>(null);const sending=useRef(false);const[operation,Operation]=useState('');const[panel,Panel]=useState(examId?'exam':'');useEffect(()=>{if(examId)Panel('exam');},[examId]);const[panelDirty,PanelDirty]=useState(false);const[tab,Tab]=useState<ChatView>('chat');const[conversation,Conversation]=useState(selectedConversationId??'');useEffect(()=>{if(selectedConversationId!==undefined)Conversation(selectedConversationId);},[selectedConversationId]);const[text,Text]=useState('');const[search,Search]=useState('');const[conversationSearch,ConversationSearch]=useState('');const[creationType,CreationType]=useState('ALL');const[selected,Selected]=useState<string[]>(initialPreferences.topicIds);const[kind,Kind]=useState(initialPreferences.lastTool);const[count,Count]=useState(initialPreferences.questionCount);const[difficulty,Difficulty]=useState(initialPreferences.difficulty);const[creation,Creation]=useState<StudyCreation>();const[practice,Practice]=useState('');const[notice,NoticeText]=useState('');const[archived,setArchived]=useState(f.status==='ARCHIVED');const current=conversation==='new'?undefined:conversation?detail.conversations.find(c=>c.id===conversation):detail.conversations.at(-1);const messages=current?.messages??current?.turns??[];const topics=f.units.flatMap(u=>u.topics);const active=!archived;useEffect(()=>setArchived(f.status==='ARCHIVED'),[f.status]);
function selectConversation(id:string){Conversation(id);onConversationSelect?.(id);}
const panelLauncher = useRef<HTMLButtonElement | null>(null);
function openPanelFrom(next: 'context' | 'library', launcher: HTMLButtonElement) {
  panelLauncher.current = launcher;
  Panel(next);
}
function dismissPanel(restoreFocus = true) {
  const launcher = panelLauncher.current;
  panelLauncher.current = null;
  Panel('');
  if (!restoreFocus || !launcher) return;
  requestAnimationFrame(() => {
    const doc = launcher.ownerDocument;
    if (launcher.isConnected && doc.activeElement === doc.body) launcher.focus({ preventScroll: true });
  });
}
function closePanel() {
  if (busy || contextWorking || (panelDirty && !window.confirm('Tenés cambios sin guardar. ¿Querés cerrar esta vista?'))) return;
  PanelDirty(false);
  dismissPanel();
}
const [contextReady,setContextReady]=useState(false),[contextWorking,setContextWorking]=useState(false);
const [historyOpenKey,setHistoryOpenKey]=useState(0);
const [renaming,setRenaming]=useState<{id:string;title:string}>();
const [renameTitle,setRenameTitle]=useState('');
const [renameError,setRenameError]=useState('');
const [practicePreview,setPracticePreview]=useState('');
const [selectedExam,setSelectedExam]=useState(examId);
const [toolTitle, setToolTitle] = useState('Preparar un apunte');
const [toolBrief, setToolBrief] = useState('');
const [toolError, setToolError] = useState('');
const sourceIds = null;
const [citedSources, setCitedSources] = useState<NonNullable<(typeof messages)[number]['sourceRefs']>>([]);
const drafts = useRef(new Map<string,string>()), pendingIntents = useRef(new Map<string,string>()), inFlight = useRef<string | undefined>(undefined);
const [cancelling, setCancelling] = useState(false);
const [deleteConfirmation, setDeleteConfirmation] = useState(false);
const attachmentPath = current ? studentAttachmentPath(f.id, current.id) : undefined;
const attachments = useChatAttachments(attachmentPath);
const generation=useStudyGeneration({detail,current,busy:busy||attachments.busy,active,run,onConversation:selectConversation,onReload,cancelGeneration});
const follow=useChatFollow(current?.id,JSON.stringify([messages.length,pending,generation.local?.requestId,generation.local?.phase,messages.map(message=>message.generation?.status)]));
async function attach(id: string, file: File, copy: boolean) {
    await attachments.upload(async () => {
        if (attachmentPath) return attachmentPath;
        const chatId = await startStudyConversation(() => run('NEW_CONVERSATION', { title: 'Nueva conversación' }), selectConversation);
        return studentAttachmentPath(f.id, chatId);
    }, id, file, copy);
    if (copy) {
        try { await onReload(); }
        catch { NoticeText('El material se guardó. Actualizá la carpeta para verlo.'); }
    }
}
async function command(action:string,data:Record<string,unknown>={}){NoticeText('');Operation(action);const key=JSON.stringify({action,data});const requestId=['CHAT','GENERATE'].includes(action)?pendingIntents.current.get(key)??crypto.randomUUID():undefined;if(requestId)pendingIntents.current.set(key,requestId);inFlight.current=requestId;try{const response=await run(action,data,requestId) as {result?:{status?:string}};pendingIntents.current.delete(key);if(response?.result?.status==='CANCELLED'){NoticeText('Detuviste la solicitud. Podés retomarla cuando quieras.');return false;}NoticeText(action==='GENERATE'?'Tu creación está lista. Abrila desde Creaciones.':action==='CHAT'?'Respuesta recibida.':'Cambios guardados.');return true;}catch(error){if(error instanceof Error && 'code' in error && !['SERVICE_UNAVAILABLE','PENDING'].includes(String(error.code)))pendingIntents.current.delete(key);return false;}finally{inFlight.current=undefined;Operation('');}}
async function stop() {
  if (!inFlight.current || !cancelGeneration || cancelling) return;
  setCancelling(true);
  try {
    const outcome = await cancelGeneration(inFlight.current);
    if(outcome==='CANCELLED')Pending(null);
    NoticeText(outcome==='CANCELLED'?'Solicitud detenida.':'La solicitud ya terminó.');
  } catch { NoticeText('No pudimos detener la solicitud. Volvé a intentar.'); }
  finally { setCancelling(false); }
}
function openChat(id: string) {
  drafts.current.set(current?.id??'new',text);
  Text(drafts.current.get(id)??'');
  selectConversation(id); Tab('chat');
}
async function send(){if(!text.trim()||busy||attachments.busy||!active||sending.current||generation.blocked)return;const submitted=text;sending.current=true;Pending(submitted);let id=current?.id;try{if(!id){id=await startStudyConversation(()=>run('NEW_CONVERSATION',{title:submitted.slice(0,80)}),selectConversation);}if(!id)return;if(await command('CHAT',{conversationId:id,message:submitted,topicIds:selected,...(sourceIds?{sourceIds}:{})}))Text(value=>value===submitted?'':value);}catch{/* parent retains error */}finally{Pending(null);sending.current=false;}}
const generationIssue = studyGenerationIssue(kind, selected);
const tools = <div className="study-exact-tools-panel">
 <div className="study-exact-tools">{[
  {kind:'NOTE',title:'Entender un tema',hint:'Un ejemplo, paso a paso.',icon:'book',color:'sky'},
  {kind:'NOTE',title:'Preparar un apunte',hint:'Lo esencial, con tus palabras.',icon:'file',color:'peach'},
  {kind:'OUTLINE',title:'Conectar ideas',hint:'Un esquema para relacionar.',icon:'layers',color:'mint'},
  {kind:'QUIZ',title:'Practicar',hint:'Preguntas con orientación.',icon:'pencil',color:'rose'},
  {kind:'MOCK_EXAM',title:'Preparar una evaluación',hint:'Un simulacro sin nota académica.',icon:'flag',color:'sky'},
  {kind:'PLAN',title:'Organizar mi repaso',hint:'Un plan que llega a tu agenda.',icon:'calendar',color:'peach'},
 ].map(tool=><button key={tool.title} disabled={busy||!active||generation.blocked} onClick={()=>{Tab('chat');if(tool.kind==='PLAN'){setSelectedExam(undefined);Panel('exam');return;}Kind(tool.kind);setToolTitle(tool.title);setToolError('');Panel('tool');}}><span className={`study-exact-tool-icon ${tool.color}`}>{tool.icon==='flag'?<svg className="fm3d-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="/brujula/icons.svg#flag"/></svg>:<FoxmindIcon name={tool.icon as 'book'}/>}</span><span><b>{tool.title}</b><small>{tool.hint}</small></span><FoxmindIcon name="chevron-right"/></button>)}</div>
</div>;
const matchingCreations = filterStudyCreations(detail.creations, search, creationType);
const matchingPractices = filterStudyCreations(detail.practices, search, creationType);
const matchingPlans=detail.exams.filter(exam=>(creationType==='ALL'||creationType==='PLAN')&&(exam.title??'').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
const creations = <div className="study-exact-creations">
 <header className="parity-foxy-sectionHead"><h2>Mis creaciones</h2></header>
 <label className="parity-foxy-search"><FoxmindIcon name="search"/><input aria-label="Buscar creaciones" type="search" placeholder="Buscar creación" value={search} onChange={event=>Search(event.target.value)}/></label>
 <div className="parity-foxy-filterRow" aria-label="Filtrar creaciones">{[['ALL','Todas'],['NOTE','Apuntes'],['PLAN','Planes']].map(([value,label])=><button key={value} aria-pressed={creationType===value} onClick={()=>CreationType(value)}>{label}</button>)}</div>
 <div className="study-exact-creation-list">
  {matchingCreations.map(item=><button className="study-exact-creation-item" key={item.id} onClick={()=>{Tab('chat');Creation(item);}}><span className="study-exact-tool-icon sky"><FoxmindIcon name={item.kind==='OUTLINE'?'layers':'file'}/></span><span><b>{item.title}</b><small>{item.kind==='NOTE'?'Preparar un apunte':'Conectar ideas'} · Privada</small></span><FoxmindIcon name="chevron-right"/></button>)}
  {matchingPractices.map(item=><button className="study-exact-creation-item" key={item.id} onClick={()=>{Tab('chat');setPracticePreview(item.id);}}><span className="study-exact-tool-icon rose"><FoxmindIcon name="edit"/></span><span><b>{item.title??'Práctica personal'}</b><small>{item.kind==='MOCK_EXAM'?'Preparar una evaluación':'Practicar'} · Privada</small></span><FoxmindIcon name="chevron-right"/></button>)}
  {matchingPlans.map(item=><button className="study-exact-creation-item" key={item.id} onClick={()=>{Tab('chat');setSelectedExam(item.id);Panel('exam');}}><span className="study-exact-tool-icon peach"><FoxmindIcon name="calendar"/></span><span><b>{item.title??'Mi repaso'}</b><small>Organizar mi repaso · Privada</small></span><FoxmindIcon name="chevron-right"/></button>)}
 </div>
 {!matchingCreations.length&&!matchingPractices.length&&!matchingPlans.length&&<div className="parity-foxy-libraryEmpty"><FoxmindIcon name="folder"/><h3>{search||creationType!=='ALL'?'No hay coincidencias':'Tus ideas tienen lugar'}</h3><p>{search||creationType!=='ALL'?'Probá otro nombre o volvé a Todas.':'Elegí una herramienta. La propuesta va a quedar acá para retomarla.'}</p><button type="button" onClick={()=>Tab('tools')}><FoxmindIcon name="spark"/>Ver herramientas</button></div>}
</div>;
const matchingChats = detail.conversations.filter(chat => chat.title.toLocaleLowerCase().includes(conversationSearch.trim().toLocaleLowerCase()));
const conversations = <div className="study-exact-history">
 <header className="parity-foxy-sectionHead"><h2>Conversaciones</h2><button type="button" disabled={busy||!active} onClick={()=>openChat('new')}><FoxmindIcon name="plus"/>Nueva</button></header>
 <label className="parity-foxy-search"><FoxmindIcon name="search"/><input aria-label="Buscar conversaciones" type="search" placeholder="Buscar conversación" value={conversationSearch} onChange={event=>ConversationSearch(event.target.value)}/></label>
 {!matchingChats.length&&<p>No encontramos conversaciones con ese nombre.</p>}
 <ul className="parity-foxy-historyList">{[...matchingChats].reverse().map(chat=><li key={chat.id}><button type="button" data-foxy-thread aria-current={current?.id===chat.id?'true':undefined} disabled={busy||!!pending} onClick={()=>openChat(chat.id)}><FoxmindIcon name="chat"/><span><strong>{chat.title}</strong><small>En esta carpeta</small></span></button><button type="button" disabled={busy||!active} data-foxy-rename aria-label={`Renombrar ${chat.title}`} onClick={()=>{setRenaming({id:chat.id,title:chat.title});setRenameTitle(chat.title);setRenameError('');Tab('chat');}}><FoxmindIcon name="edit"/></button></li>)}</ul>
 <p className="parity-foxy-privacy"><FoxmindIcon name="lock"/>Este espacio es privado.</p>
</div>;
return <div className={`${s.workspaceFrame} parity-study-workspace`}>{archived&&<Notice>Esta carpeta está archivada. Podés consultar tu trabajo y reactivarla desde Opciones.</Notice>}{notice&&<p role="status" className={notice==='Respuesta recibida.'?s.sr:s.status}>{notice}</p>}<FoxyChatLayout view={tab} onView={Tab} history={conversations} historyKey={current?.id} historyOpenKey={historyOpenKey} tools={tools} creations={creations} creationsCount={detail.creations.length+detail.practices.length+detail.exams.length}
  newDisabled={busy||attachments.busy||!active} onNew={()=>openChat('new')}
  context={<><Link className={`${s.backLink} parity-ai-backLink`} href="/carpetas-de-estudio" aria-label="Volver a Mis carpetas"><FoxmindIcon name="arrow-left"/></Link>
    <button type="button" className={`${s.contextLaunch} parity-ai-contextLaunch`} aria-haspopup="dialog" onClick={event => openPanelFrom('context', event.currentTarget)}>
      <FoxmindIcon name="book"/><span><small>{f.linkedClassroomId?'Carpeta + aula vinculada':'Contexto de tu carpeta'}</small><strong>{f.name}</strong></span><FoxmindIcon name="chevron-right"/>
    </button></>}>
  <section className={`${s.chat} parity-ai-conversation`} aria-label="Conversación con Foxy">{current?.sourceUnavailable&&<Notice>Una fuente de esta conversación ya no está disponible. El historial se conserva.</Notice>}<div className={`${s.messages} parity-ai-messages`} ref={follow.ref} onScroll={follow.onScroll} aria-label="Mensajes con Foxy">{!messages.length&&!pending&&!generation.local?<div className={`${s.chatEmpty} parity-ai-chatEmpty`}><div className={`${s.welcomeArt} parity-ai-foxyMark`}><img src="/foxmind/foxy.webp" alt=""/><span className="parity-ai-orbitOne"><FoxmindIcon name="book"/></span><span className="parity-ai-orbitTwo"><FoxmindIcon name="spark"/></span></div><h2>Un espacio para tus preguntas.</h2><p>Preguntá, probá otra explicación o prepará tu próximo repaso. A tu ritmo.</p><div className={`${s.welcomeActions} parity-ai-welcomeActions`}><button onClick={()=>{Text('Explicamelo con un ejemplo');requestAnimationFrame(()=>document.getElementById('study-message')?.focus());}}><FoxmindIcon name="chat-square"/>Explicamelo con un ejemplo</button><button onClick={()=>{Text('Quiero organizar mi repaso');requestAnimationFrame(()=>document.getElementById('study-message')?.focus());}}><FoxmindIcon name="calendar"/>Quiero organizar mi repaso</button></div></div>:messages.map((message,index)=>{
    const result=studyGenerationResult(detail,message),request=message.generation&&generation.requests.find(item=>item.requestId===message.generation!.requestId);
    return <Fragment key={message.id??index}><article className={message.role==='user'?`${s.userMessage} parity-ai-userMessage`:`${s.foxyMessage} parity-ai-foxyMessage`}><ChatByline user={message.role==='user'} identity={identity}/>
      {result?<button type="button" className="study-exact-generation-result" onClick={()=>{if(result.kind==='creation')Creation(detail.creations.find(item=>item.id===result.id));else setPracticePreview(result.id);}}><span className="study-exact-tool-icon sky"><FoxmindIcon name={result.kind==='practice'?'edit':'file'}/></span><span><small>Tu propuesta está lista</small><strong>{result.title}</strong><b>Abrir creación</b></span><FoxmindIcon name="chevron-right"/></button>:message.creationId||message.practiceId?<div className="study-exact-generation-notice"><p>No pudimos abrir la propuesta guardada. Volvé a consultar la carpeta.</p><button onClick={()=>void onReload().catch(()=>NoticeText('No pudimos actualizar la carpeta.'))}>Actualizar</button></div>:<div className={`${s.prose} parity-ai-prose`}>{message.role==='user'?(message.content??message.text):<FoxyMarkdown markdown={message.content??message.text??''}/>}</div>}
      {message.role!=='user'&&message.sourceRefs?.length?<div className={`${s.citations} parity-ai-citations`}><button type="button" aria-haspopup="dialog" onClick={()=>setCitedSources(message.sourceRefs??[])}>{`Fuentes consultadas · ${message.sourceRefs.length}`}</button></div>:null}
    </article>{request&&<StudyGenerationStatus request={request} disabled={busy||!active||generation.blocked} cancelling={generation.cancelling===request.requestId} onStop={()=>void generation.stop(request.requestId)} onRetry={()=>void generation.retry(request)}/>}</Fragment>;
  })}{generation.local&&(!generation.local.conversationId||!current||generation.local.conversationId===current.id)&&<>
    <article className={`${s.userMessage} parity-ai-userMessage`}><ChatByline user identity={identity}/><div className={`${s.prose} parity-ai-prose`}>{generation.local.data.message}</div></article>
    {generation.local.phase==='SENDING'||generation.local.phase==='SYNCING'?<div className="study-exact-generation" role="status"><img src="/brujula/foxy-logotipo-redondo.webp" alt="Foxy"/><div><small>Foxy está trabajando en tu idea</small><strong>{generation.local.phase==='SYNCING'?'Abriendo tu propuesta guardada':generation.local.conversationId?'Preparando tu propuesta':'Abriendo tu conversación'}</strong><span className="study-exact-generation-track" aria-hidden="true"/></div>{generation.local.phase==='SENDING'&&generation.local.conversationId&&<button disabled={!!generation.cancelling} onClick={()=>void generation.stop(generation.local!.requestId)}>{generation.cancelling?'Deteniendo…':'Detener'}</button>}</div>:<section className="study-exact-generation-notice" role="status"><p>{generation.local.phase==='UNCERTAIN'?'No pudimos confirmar el estado de la solicitud. Tu indicación se conserva en esta pantalla.':generation.local.phase==='CANCELLED'?'La preparación se detuvo. Tu indicación se conserva.':generation.local.error}</p><button disabled={busy||generation.submitting||!active} onClick={()=>void generation.retryLocal()}><FoxmindIcon name="refresh"/>Reintentar</button></section>}
  </>}{generation.error&&<Notice error>{generation.error}</Notice>}{pending&&<><article className={`${s.userMessage} parity-ai-userMessage`}><ChatByline user identity={identity}/><div className={`${s.prose} parity-ai-prose`}>{pending}</div></article><AsyncFeedback compact showDelay title={operation==='CHAT'?'Procesando tu solicitud':'Abriendo tu conversación'} detail={operation==='CHAT'?'Tu respuesta va a quedar en este chat.':undefined}/><button className={`${s.stop} parity-ai-stop`} type="button" disabled={cancelling||!inFlight.current} onClick={()=>void stop()}>Detener</button></>}</div>{follow.unread&&<button type="button" onClick={follow.jump}>Ver mensajes nuevos ↓</button>}<form className={`${s.composer} parity-ai-composer`} onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor="study-message" className={`${s.sr} parity-ai-sr`}>Tu mensaje para Foxy</label><textarea id="study-message" value={text} onChange={e=>Text(e.target.value)} maxLength={5000} disabled={!active||!!pending||generation.blocked} placeholder="¿Qué te gustaría entender mejor?" rows={3} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy&&active&&text.trim())e.currentTarget.form?.requestSubmit();}}}/><div className={`${s.inline} parity-ai-inline`}><div className={`${s.composerTools} parity-ai-composerTools`}>
  <button type="button" aria-label="Biblioteca" aria-haspopup="dialog" onClick={event => openPanelFrom('library', event.currentTarget)}><FoxmindIcon name="book"/>Biblioteca{' '}<b className="parity-library-count">{detail.sources.length+attachments.items.length}</b></button>
  <ChatAttachmentButton iconOnly label="Agregar un material a la biblioteca" folderName={f.name} disabled={attachments.busy||busy||!!pending||!active} onUpload={attach}/>
</div><span className="parity-chat-key-hint">Enter para enviar · Shift + Enter para otra línea</span><button className={`${s.primary} parity-ai-primary`} disabled={!text.trim()||!active||busy||attachments.busy||!!pending||generation.blocked}>Enviar <FoxmindIcon name="arrow-right"/></button></div></form>
<p className={`${s.chatDisclaimer} parity-ai-chatDisclaimer`}>Foxy puede equivocarse. Revisá sus propuestas.</p></section></FoxyChatLayout>
  {citedSources.length > 0 && <Dialog labeledClose title="Fuentes consultadas" onClose={() => setCitedSources([])}>
    <ul className={`${s.citedSources} parity-ai-citedSources`}>{citedSources.map(ref => {
      const source = detail.sources.find(item => item.id === ref.id && item.version === ref.version);
      const attachment = attachments.items.find(item => item.id === ref.id);
      return <li key={`${ref.id}:${ref.version}`}>{source?.title ?? attachment?.name ?? 'Fuente no disponible'}</li>;
    })}</ul>
  </Dialog>}
  {renaming&&<Dialog title="Renombrar conversación" className="study-exact-rename-dialog" onClose={()=>{if(!busy){setRenaming(undefined);setHistoryOpenKey(value=>value+1);}}}><form onSubmit={event=>{event.preventDefault();if(!renameTitle.trim()){setRenameError('Dale un nombre a esta conversación.');return;}void command('RENAME_CONVERSATION',{conversationId:renaming.id,title:renameTitle.trim()}).then(ok=>{if(ok){setRenaming(undefined);setHistoryOpenKey(value=>value+1);}else setRenameError('No pudimos guardar el nombre. Podés reintentar.');});}}><label>Nombre de la conversación<input autoFocus required maxLength={120} value={renameTitle} onChange={event=>setRenameTitle(event.target.value)}/></label>{renameError&&<Notice error>{renameError}</Notice>}<footer className="study-exact-dialog-footer"><button type="button" disabled={busy} onClick={()=>{setRenaming(undefined);setHistoryOpenKey(value=>value+1);}}>Cancelar</button><button className="primary" disabled={busy}>Guardar</button></footer></form></Dialog>}
  {practicePreview&&detail.practices.find(item=>item.id===practicePreview)&&<Dialog title="Tu creación" className="study-exact-reading-dialog" onClose={()=>setPracticePreview('')}><p className="study-exact-subtitle">Preguntas con orientación.</p><article className="study-exact-reader-content"><div className="study-exact-reader-title"><span className="study-exact-tool-icon sky"><FoxmindIcon name="edit"/></span><div><small>Creación privada</small><h3>{detail.practices.find(item=>item.id===practicePreview)?.title??'Práctica personal'}</h3></div></div><p>Vas a responder {detail.practices.find(item=>item.id===practicePreview)?.questions.length} preguntas, una por pantalla. Tus respuestas se guardan en esta carpeta.</p><h4>A tu ritmo</h4><p>Podés volver a las preguntas y revisar todo antes de finalizar.</p><h4>Al terminar</h4><p>Recibís una orientación por respuesta. No se envía a un docente ni modifica una nota académica.</p></article><footer className="study-exact-dialog-footer"><button onClick={()=>setPracticePreview('')}>Cerrar</button><button onClick={()=>{const item=detail.practices.find(item=>item.id===practicePreview)!;downloadPlainText(item.title??'Práctica personal',item.questions.map((question,index)=>`${index+1}. ${question.prompt}\n${question.options?.map(option=>option.text).join('\n')??''}`).join('\n\n'));}}><FoxmindIcon name="download"/>Descargar TXT</button><button className="primary" onClick={()=>{Practice(practicePreview);setPracticePreview('');}}>{detail.practices.find(item=>item.id===practicePreview)?.status==='FINALIZED'?'Ver orientación':Object.keys(detail.practices.find(item=>item.id===practicePreview)?.answers??{}).length?'Retomar práctica':'Empezar práctica'}</button></footer></Dialog>}
  {panel==='context'&&<FoxyDialog description="Vincular un aula es opcional. Tus archivos siempre son privados." title="El contexto de tu carpeta" className="study-exact-context-dialog" onClose={closePanel} footer={<><button disabled={contextWorking} onClick={closePanel}>Cancelar</button><button disabled={contextWorking} onClick={()=>Panel('library')}><FoxmindIcon name="book"/>Abrir biblioteca</button><button type="submit" form="study-context-form" className="primary" disabled={!contextReady}><FoxmindIcon name="check"/>{contextWorking?'Guardando…':'Guardar contexto'}</button></>}><StudyContext onSaveAvailability={setContextReady} onWorkingChange={setContextWorking} detail={detail} catalog={catalog} busy={busy} onReload={onReload} onClose={closePanel} onLibrary={()=>Panel('library')}/></FoxyDialog>}
  {(panel==='library'||panel==='materials')&&<FoxyDialog description="Tus fuentes, siempre a mano para conversar." footer={<button onClick={closePanel}><FoxmindIcon name="arrow-left"/>Volver al chat</button>} title="Biblioteca de contexto" className="parity-ai-tray study-exact-library-dialog" onClose={closePanel}><StudyLibrary detail={detail} catalog={catalog} busy={busy} run={run} onContext={()=>Panel('context')} onClose={closePanel} onStudyTopic={topic=>{Selected([topic.id]);Text('Ayudame a estudiar '+topic.title+'.');dismissPanel(false);Tab('chat');requestAnimationFrame(()=>document.getElementById('study-message')?.focus());}} attachments={attachments.items.length?<section className="study-exact-chat-attachments"><h3>Adjuntos de este chat</h3><ChatAttachmentList items={attachments.items} error={attachments.error} disabled={attachments.busy||busy||!!pending||!active} onRemove={id=>void attachments.remove(id)}/></section>:undefined}/></FoxyDialog>}
  {panel==='tool'&&<FoxyDialog description="Contale a Foxy qué necesitás. Después podés revisar y editar." title={toolTitle} className="study-exact-tool-dialog" onClose={closePanel}><form className="study-exact-tool-form" onSubmit={event=>{event.preventDefault();if(!toolBrief.trim()){setToolError('Contá qué querés preparar para que Foxy tenga un punto de partida.');return;}if(topics.length&&!selected.length){setToolError('Elegí al menos un tema de tu carpeta.');return;}const submitted=toolBrief;const data=studyGenerationData(kind,submitted,selected,count,difficulty) as StudyGenerationInput;dismissPanel(false);Tab('chat');void generation.submit(data).then(ok=>{if(ok)setToolBrief(value=>value===submitted?'':value);});}}><div className="study-exact-scope-banner"><FoxmindIcon name="book"/><div><b>{f.name}</b><p>{detail.sources.filter(source=>source.available&&source.readable!==false).length} materiales incluidos en esta conversación.</p></div></div><label>¿Qué te gustaría preparar?<textarea autoFocus required maxLength={1500} value={toolBrief} onChange={event=>setToolBrief(event.target.value)} placeholder="Por ejemplo: un apunte con una explicación sencilla y dos ejemplos cotidianos…"/></label><button className="study-exact-example" type="button" onClick={()=>setToolBrief('Ayudame a repasar las ideas principales con un ejemplo y una pregunta para comprobar si entendí.')}><FoxmindIcon name="spark"/>Usar una idea para empezar</button>{topics.length>0&&<fieldset className="study-exact-choice-group"><legend>Temas que querés incluir</legend><div>{topics.map(topic=><label key={topic.id}><input type="checkbox" checked={selected.includes(topic.id)} onChange={event=>Selected(event.target.checked?[...selected,topic.id]:selected.filter(id=>id!==topic.id))}/>{topic.title}</label>)}</div></fieldset>}{toolError&&<Notice error>{toolError}</Notice>}<footer className="study-exact-dialog-footer"><button type="button" onClick={closePanel}>Cancelar</button><button type="submit" className="primary" disabled={busy||!active||generation.blocked||!!generationIssue}><FoxmindIcon name="spark"/>Preparar propuesta</button></footer></form></FoxyDialog>}
  {panel==='options'&&<Dialog title="Opciones de la carpeta" onClose={closePanel}><div className={`${s.dialogBody} parity-ai-dialogBody`}><p>Esta carpeta y todo su contenido son privados.</p><button disabled={busy} onClick={()=>void command(archived?'REACTIVATE':'ARCHIVE').then(ok=>{if(ok)dismissPanel();})}>{archived?'Reactivar carpeta':'Archivar carpeta'}</button><p>Archivar conserva tu trabajo y cancela avisos pendientes.</p><button className={`${s.danger} parity-ai-danger`} disabled={busy} type="button" onClick={() => setDeleteConfirmation(true)}>Eliminar carpeta</button>
    {deleteConfirmation && <StudyConfirmation title="Eliminar carpeta" confirmLabel="Eliminar carpeta" destructive busy={busy}
      description={`Vas a perder el acceso a «${f.name}» y se cancelarán sus avisos pendientes. Los eventos que ya agregaste a Agenda se conservan.`}
      onClose={() => setDeleteConfirmation(false)} onConfirm={async () => {
        await run('DELETE', { confirmed: true });
        window.location.assign('/carpetas-de-estudio');
      }}/>}</div></Dialog>}{creation&&<StudyCreationEditor creation={creation} disabled={!active||busy} onClose={()=>Creation(undefined)} onSave={async(title,body)=>{if(await command('EDIT_CREATION',{creationId:creation.id,title,body}))Creation(undefined);}}/>}{practice&&detail.practices.find(item=>item.id===practice)&&<StudyPracticeView key={practice} folderName={f.name} onClose={()=>{if(!busy&&(!panelDirty||window.confirm('Hay respuestas sin guardar. ¿Querés cerrar?'))){PanelDirty(false);Practice('');}}} onNewAttempt={async()=>{if(await command('NEW_ATTEMPT',{practiceId:practice})){const latest=await createStudyClient().get(f.id);await onReload();const next=latest.practices.at(-1);if(next){Practice(next.id);PanelDirty(false);}}}} onDirtyChange={PanelDirty} practice={detail.practices.find(item=>item.id===practice)!} busy={busy||!active} run={run}/>}{panel==='exam'&&<Dialog className="parity-study-plan-dialog" title={selectedExam||examId?'Tu recorrido de repaso':'Un plan para llegar con calma'} onClose={closePanel}>{examId&&!detail.exams.some(exam=>exam.id===examId)&&<Notice>Este plan de repaso ya no está disponible.</Notice>}<StudyExamPlanner onClose={closePanel} onPrepared={setSelectedExam} examId={selectedExam??examId} onDirtyChange={PanelDirty} detail={detail} busy={busy||!active} run={run}/></Dialog>}</div>;}
function StudyCreationEditor({creation,onClose,onSave,disabled}:{creation:StudyCreation;onClose:()=>void;onSave:(title:string,body:string)=>Promise<unknown>;disabled:boolean}){
 const savedBody=creation.markdown??creation.body??'';
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(creation.title),[body,setBody]=useState(savedBody),[discard,setDiscard]=useState(false);
 const dirty=title!==creation.title||body!==savedBody;
 function cancel(){if(dirty)setDiscard(true);else setEditing(false);}
 return <Dialog title={editing?'Dale tu mirada':'Tu creación'} className="study-exact-reading-dialog" onClose={()=>editing?cancel():onClose()}>
  <p className="study-exact-subtitle">{editing?'Los cambios quedan en tu creación privada.':creation.kind==='NOTE'?'Preparar un apunte':'Conectar ideas'}</p>
  {creation.sourceUnavailable&&<Notice>Una fuente ya no está disponible. Esta creación se conserva como historial.</Notice>}
  {editing?<form onSubmit={event=>{event.preventDefault();void onSave(title,body);}}><label>Título<input autoFocus required maxLength={120} value={title} onChange={event=>setTitle(event.target.value)}/></label><label>Contenido<textarea required value={body} rows={12} onChange={event=>setBody(event.target.value)}/></label><footer className="study-exact-dialog-footer"><button type="button" onClick={cancel}>Cancelar</button><button className="primary" disabled={disabled||!dirty}>Guardar cambios</button></footer></form>:<><article className="study-exact-reader-content"><div className="study-exact-reader-title"><span className="study-exact-tool-icon sky"><FoxmindIcon name={creation.kind==='OUTLINE'?'layers':'file'}/></span><div><small>Creación privada</small><h3>{title}</h3></div></div><FoxyMarkdown markdown={body}/></article><footer className="study-exact-dialog-footer"><button onClick={onClose}>Cerrar</button><button disabled={disabled} onClick={()=>setEditing(true)}><FoxmindIcon name="edit"/>Editar</button><button onClick={()=>downloadPlainText(creation.title,savedBody)}><FoxmindIcon name="download"/>Descargar TXT</button></footer></>}
  {discard&&<Dialog title="¿Descartás tus cambios?" onClose={()=>setDiscard(false)}><p>Podés volver al editor y seguir con tu idea. La versión guardada se conserva.</p><footer className="study-exact-dialog-footer"><button onClick={()=>setDiscard(false)}>Seguir editando</button><button onClick={()=>{setTitle(creation.title);setBody(savedBody);setDiscard(false);setEditing(false);}}>Descartar</button></footer></Dialog>}
 </Dialog>;
}
