import { ChatByline, FoxyChatLayout, type ChatIdentity, type ChatView } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentButton, ChatAttachmentList } from '../../../../../shared-ui/ChatAttachmentControls';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { useChatAttachments } from '../../../shared/use-chat-attachments';
import { studentAttachmentPath } from '../../../shared/chat-attachments';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { FoxyToolPicker } from '../../../../../shared-ui/FoxyToolPicker';
import { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Dialog,Notice} from '../../../../../shared-ui/feedback';
import {createStudyClient,studyGenerationData,studyGenerationIssue,type StudyDetail,type StudyCollection,type StudyCreation} from '../api/study-client';
import { StudyMaterials } from './study-materials';
import {FoxyMarkdown} from '../../../../../shared-ui/markdown';
import {StudyPracticeView,StudyExamPlanner} from './study-practice';
import s from './study.module.css';
import {filterStudyCreations,startStudyConversation,studyInitialPreferences} from '../model/study-discovery';
type Run=(action:string,data?:Record<string,unknown>)=>Promise<unknown>;
export function StudyWorkspace({identity,detail,catalog,busy,run,onReload}:{identity?:ChatIdentity;detail:StudyDetail;catalog:StudyCollection;busy:boolean;run:Run;onReload:()=>Promise<void>}){const f=detail.folder;const initialPreferences=studyInitialPreferences(detail.memory,f.units.flatMap(u=>u.topics.map(t=>t.id)));const[pending,Pending]=useState<string|null>(null);const sending=useRef(false);const[operation,Operation]=useState('');const[panel,Panel]=useState('');const[panelDirty,PanelDirty]=useState(false);function closePanel(){if(busy)return;if(panelDirty&&!window.confirm('Tenés cambios sin guardar. ¿Querés cerrar esta vista?'))return;PanelDirty(false);Panel('');}const[tab,Tab]=useState<ChatView>('chat');const[conversation,Conversation]=useState('');const[text,Text]=useState('');const[search,Search]=useState('');const[conversationSearch,ConversationSearch]=useState('');const[creationType,CreationType]=useState('ALL');const[selected,Selected]=useState<string[]>(initialPreferences.topicIds);const[kind,Kind]=useState(initialPreferences.lastTool);const[count,Count]=useState(initialPreferences.questionCount);const[difficulty,Difficulty]=useState(initialPreferences.difficulty);const[creation,Creation]=useState<StudyCreation>();const[practice,Practice]=useState('');const[notice,NoticeText]=useState('');const[archived,setArchived]=useState(f.status==='ARCHIVED');const current=conversation?detail.conversations.find(c=>c.id===conversation):detail.conversations.at(-1);const messages=current?.messages??current?.turns??[];const follow=useChatFollow(current?.id,JSON.stringify([messages.length,pending]));const topics=f.units.flatMap(u=>u.topics);const active=!archived;useEffect(()=>setArchived(f.status==='ARCHIVED'),[f.status]);
const attachmentPath = current ? studentAttachmentPath(f.id, current.id) : undefined;
const attachments = useChatAttachments(attachmentPath);
async function attach(id: string, file: File, copy: boolean) {
    await attachments.upload(async () => {
        if (attachmentPath) return attachmentPath;
        const chatId = await startStudyConversation(() => run('NEW_CONVERSATION', { title: 'Nueva conversación' }), Conversation);
        return studentAttachmentPath(f.id, chatId);
    }, id, file, copy);
    if (copy) {
        try { await onReload(); }
        catch { NoticeText('El material se guardó. Actualizá la carpeta para verlo.'); }
    }
}
async function command(action:string,data:Record<string,unknown>={}){NoticeText('');Operation(action);try{await run(action,data);NoticeText(action==='GENERATE'?'Tu creación está lista. Abrila desde Creaciones.':action==='CHAT'?'Respuesta recibida.':'Cambios guardados.');if(action==='GENERATE')Tab('creations');return true;}catch{return false;}finally{Operation('');}}
async function send(){if(!text.trim()||busy||attachments.busy||!active||sending.current)return;const submitted=text;sending.current=true;Pending(submitted);let id=conversation||current?.id;try{if(!id){id=await startStudyConversation(()=>run('NEW_CONVERSATION',{title:submitted.slice(0,80)}),Conversation);}if(!id)return;if(await command('CHAT',{conversationId:id,message:submitted,topicIds:selected}))Text(value=>value===submitted?'':value);}catch{/* parent retains error */}finally{Pending(null);sending.current=false;}}
const generationIssue = studyGenerationIssue(kind, selected);
const tools = <>
  <h2>Herramientas de estudio</h2>
  <FoxyToolPicker value={kind} disabled={busy || !active} onChange={Kind} items={[
    { value:'NOTE', label:'Crear apunte', hint:'Explicaciones para repasar', example:'Explicame el tema con un ejemplo.', icon:'book' },
    { value:'OUTLINE', label:'Crear esquema', hint:'Ideas y relaciones', example:'Conectá los conceptos principales de la unidad.', icon:'shapes' },
    { value:'QUIZ', label:'Crear quiz', hint:'Preguntas para practicar', example:'Preguntame qué aprendí sobre este tema.', icon:'list-checks' },
    { value:'EXERCISE', label:'Crear ejercicios', hint:'Aplicá lo que aprendiste', example:'Dame situaciones para aplicar lo que estudié.', icon:'clipboard' },
    { value:'MOCK_EXAM', label:'Crear simulacro', hint:'Practicá antes del examen', example:'Prepará un simulacro con los temas del plan.', icon:'calendar' },
  ]}/>
  <section className={s.toolConfiguration} aria-label="Preparar creación">
    <label>Indicaciones para Foxy <textarea value={text} onChange={event => Text(event.target.value)} rows={2} maxLength={5000}/></label>
    {['QUIZ','EXERCISE','MOCK_EXAM'].includes(kind) && <div className={s.inline}>
      <label>Preguntas<input type="number" min={1} max={30} value={count} onChange={event => Count(Number(event.target.value))}/></label>
      <label>Dificultad<select value={difficulty} onChange={event => Difficulty(event.target.value)}>
        <option value="EASY">Inicial</option><option value="MEDIUM">Intermedia</option><option value="HARD">Avanzada</option>
      </select></label>
    </div>}
    {generationIssue && <p role="status">{generationIssue}</p>}
    <div className={s.inline}>
      <button onClick={() => Panel('context')}>Elegir temas · {selected.length}</button>
      <button className={s.primary} disabled={busy || !active || !!generationIssue}
        onClick={() => void command('GENERATE', studyGenerationData(kind, text, selected, count, difficulty))}>
        {operation === 'GENERATE' ? 'Foxy está trabajando…' : 'Generar para estudiar'}
      </button>
      <button disabled={!active} onClick={() => Panel('exam')}>Preparar un examen</button>
    </div>
    {operation === 'GENERATE' && <AsyncFeedback compact title="Preparando tu creación" detail="Aparecerá en Creaciones cuando esté lista."/>}
  </section>
</>;
const matchingCreations = filterStudyCreations(detail.creations, search, creationType);
const matchingPractices = filterStudyCreations(detail.practices, search, creationType);
const creations = <>
  <h2>Mis creaciones</h2>
  <div className={s.studyFilters}>
    <label>Buscar creación<input type="search" value={search} onChange={event => Search(event.target.value)}/></label>
    <label>Tipo<select value={creationType} onChange={event => CreationType(event.target.value)}>
      <option value="ALL">Todos</option><option value="NOTE">Apuntes</option><option value="OUTLINE">Esquemas</option>
      <option value="QUIZ">Quizzes</option><option value="EXERCISE">Ejercicios</option><option value="MOCK_EXAM">Simulacros</option>
    </select></label>
  </div>
  {!matchingCreations.length && !matchingPractices.length && <p>
    {detail.creations.length || detail.practices.length ? 'No hay creaciones con esos filtros.' : 'Tus apuntes, esquemas y prácticas aparecerán acá.'}
  </p>}
  <div className={s.studyCreations}>
    {matchingCreations.map(item => <button className={s.listRow} key={item.id} onClick={() => Creation(item)}>
      <strong>{item.title}</strong><small>{item.kind === 'NOTE' ? 'Apunte' : 'Esquema'} · Privado</small>
    </button>)}
    {matchingPractices.map(item => <button className={s.listRow} key={item.id} onClick={() => Practice(item.id)}>
      <strong>{item.title ?? 'Práctica personal'}</strong>
      <small>{item.kind === 'QUIZ' ? 'Quiz' : item.kind === 'MOCK_EXAM' ? 'Simulacro' : 'Ejercicios'} · {item.status === 'FINALIZED' ? 'Ver devolución' : 'Continuar práctica'}</small>
    </button>)}
  </div>
</>;
const matchingChats = detail.conversations.filter(chat => chat.title.toLocaleLowerCase().includes(conversationSearch.trim().toLocaleLowerCase()));
const conversations = <div className={s.historyRows}>
  <label>Buscar conversación<input type="search" value={conversationSearch} onChange={event => ConversationSearch(event.target.value)}/></label>
  {!matchingChats.length && <p>{detail.conversations.length ? 'No hay conversaciones con ese título.' : 'Tu primer chat empieza con una pregunta.'}</p>}
  {[...matchingChats].reverse().map(chat => <button className={s.listRow} aria-pressed={current?.id === chat.id}
    key={chat.id} disabled={busy || !!pending} onClick={() => { Conversation(chat.id); Tab('chat'); }}>
    <strong>{chat.title}</strong><small>{current?.id === chat.id ? 'En curso' : f.name}</small>
  </button>)}
</div>;
return <><Link className={s.back} href="/carpetas-de-estudio">← Carpetas de estudio</Link><header className={s.heading}><div><p className={s.eyebrow}>{f.academicYear} · Sólo para vos{archived?' · Archivada':''}</p><h1>{f.name}</h1></div><div className={s.actions}><button onClick={()=>Panel('materials')}>Materiales y Plan</button><button className={s.primary} disabled={busy||attachments.busy||!active} onClick={()=>void startStudyConversation(()=>run('NEW_CONVERSATION',{title:'Nueva conversación'}),id=>{Conversation(id);Tab('chat');Text('');}).catch(e=>NoticeText(e instanceof Error?e.message:'No pudimos abrir un nuevo chat.'))}>Nuevo chat</button><button onClick={()=>Panel('options')}>Opciones</button></div></header>{archived&&<Notice>Esta carpeta está archivada. Podés consultar tu trabajo y reactivarla desde Opciones.</Notice>}{notice&&<p role="status" className={notice==='Respuesta recibida.'?s.sr:s.status}>{notice}</p>}<FoxyChatLayout view={tab} onView={Tab} history={conversations} historyKey={current?.id} tools={tools} creations={creations}>
  <section className={s.chat} aria-label="Conversación con Foxy"><header className={s.chatHeader}><div><h2>{current?.title??'Estudiá con Foxy'}</h2><p>{f.name} · Contexto de esta carpeta</p></div><button onClick={()=>Panel('context')}>Temas y fuentes · {selected.length}</button></header>{current?.sourceUnavailable&&<Notice>Una fuente de esta conversación ya no está disponible. El historial se conserva.</Notice>}<div className={s.messages} ref={follow.ref} onScroll={follow.onScroll} aria-label="Mensajes con Foxy">{!messages.length&&!pending?<div className={s.chatEmpty}><img src="/brujula/avatars/foxy-explorer.webp" alt="" onError={e=>{e.currentTarget.hidden=true;}}/><h2>Hagamos lugar a tus preguntas</h2><p>Pedí una explicación, conectá ideas o elegí una herramienta para practicar. Si falta material, Foxy te lo va a decir.</p><button onClick={()=>Panel('materials')}>Ver mis materiales</button></div>:messages.map((m,i)=><article className={m.role==='user'?s.userMessage:s.foxyMessage} key={i}><ChatByline user={m.role==='user'} identity={identity}/><div className={s.prose}>{m.role==='user'?(m.content??m.text):<FoxyMarkdown markdown={m.content??m.text??''}/>}</div>{m.role!=='user'&&m.sourceRefs?.length?<details className={s.citations}><summary>Fuentes consultadas · {m.sourceRefs.length}</summary><ul>{m.sourceRefs.map(ref=>{const source=detail.sources.find(v=>v.id===ref.id&&v.version===ref.version);const attachment=attachments.items.find(v=>v.id===ref.id);return <li key={`${ref.id}:${ref.version}`}>{source?.title??attachment?.name??'Fuente no disponible'}</li>;})}</ul></details>:null}</article>)}{pending&&<><article className={s.userMessage}><ChatByline user identity={identity}/><div className={s.prose}>{pending}</div><small>Enviado para procesar</small></article><AsyncFeedback compact showDelay title="Foxy está preparando tu respuesta" detail="Está trabajando con los temas y fuentes de esta carpeta."/></>}</div>{follow.unread&&<button type="button" onClick={follow.jump}>Ver mensajes nuevos ↓</button>}<form className={s.composer} onSubmit={e=>{e.preventDefault();void send();}}><ChatAttachmentList items={attachments.items} error={attachments.error} disabled={attachments.busy||busy||!!pending||!active} onRemove={id=>void attachments.remove(id)}/><label htmlFor="study-message" className={s.sr}>Tu mensaje para Foxy</label><textarea id="study-message" value={text} onChange={e=>Text(e.target.value)} maxLength={5000} disabled={!active||!!pending} placeholder="Escribile a Foxy…" rows={3} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy&&active&&text.trim())e.currentTarget.form?.requestSubmit();}}}/><div className={s.inline}><div className={s.composerTools}>
  <ChatAttachmentButton folderName={f.name} disabled={attachments.busy||busy||!!pending||!active} onUpload={attach}/>
  <button type="button" onClick={()=>Tab('tools')}><FoxmindIcon name="spark"/> Herramientas</button>
</div><button className={s.primary} disabled={!text.trim()||!active||busy||attachments.busy||!!pending}>Enviar</button></div></form>
<p className={s.chatDisclaimer}>Foxy puede equivocarse. Revisá sus respuestas y fuentes.</p></section></FoxyChatLayout>
  {panel==='context'&&<Dialog labeledClose title="Temas y fuentes" onClose={closePanel}><div className={s.dialogBody}><p>Elegí temas para orientar las próximas respuestas y creaciones.</p><fieldset disabled={busy||!active}><legend>Temas del plan</legend>{topics.map(t=><label key={t.id} className={s.check}><input type="checkbox" checked={selected.includes(t.id)} onChange={e=>Selected(e.target.checked?[...selected,t.id]:selected.filter(id=>id!==t.id))}/>{t.title}</label>)}</fieldset><h3>Fuentes disponibles</h3>{detail.sources.length?detail.sources.map(v=><p key={v.id}>{v.title} · {v.kind==='PLAN'?'Plan de estudio propio':v.origin==='OWN'?'Material propio':'Aula vinculada'}{!v.available?' · No disponible':''}</p>):<p>Agregá materiales legibles para que Foxy pueda fundamentar sus explicaciones.</p>}</div></Dialog>}{panel==='materials'&&<Dialog labeledClose className={s.materialDialog} title="Materiales y Plan" onClose={closePanel}><StudyMaterials onDirtyChange={PanelDirty} onStudyTopic={topic=>{Selected([topic.id]);Text('Ayudame a estudiar '+topic.title+'.');Panel('');Tab('chat');requestAnimationFrame(()=>document.getElementById('study-message')?.focus());}} detail={detail} catalog={catalog} busy={busy} run={run} onReload={onReload}/></Dialog>}{panel==='options'&&<Dialog title="Opciones de la carpeta" onClose={closePanel}><div className={s.dialogBody}><p>Esta carpeta y todo su contenido son privados.</p><button disabled={busy} onClick={()=>void command(archived?'REACTIVATE':'ARCHIVE').then(ok=>{if(ok)Panel('');})}>{archived?'Reactivar carpeta':'Archivar carpeta'}</button><p>Archivar conserva tu trabajo y cancela avisos pendientes.</p><button className={s.danger} disabled={busy} onClick={()=>{if(window.confirm(`¿Eliminar «${f.name}»? Se revocará su acceso y se cancelarán avisos. Los eventos de Agenda confirmados se conservan.`))void command('DELETE',{confirmed:true}).then(ok=>{if(ok)window.location.assign('/carpetas-de-estudio');});}}>Eliminar carpeta</button></div></Dialog>}{creation&&<StudyCreationEditor creation={creation} disabled={!active||busy} onClose={()=>Creation(undefined)} onSave={async(title,body)=>{if(await command('EDIT_CREATION',{creationId:creation.id,title,body}))Creation(undefined);}}/>}{practice&&<Dialog title="Práctica personal" onClose={()=>{if(!busy&&(!panelDirty||window.confirm('Hay respuestas sin guardar. ¿Querés cerrar?'))){PanelDirty(false);Practice('');}}}><StudyPracticeView key={practice} onNewAttempt={async()=>{if(await command('NEW_ATTEMPT',{practiceId:practice})){const latest=await createStudyClient().get(f.id);const next=latest.practices.at(-1);if(next){Practice(next.id);PanelDirty(false);}}}} onDirtyChange={PanelDirty} practice={detail.practices.find(p=>p.id===practice)!} busy={busy||!active} run={run}/></Dialog>}{panel==='exam'&&<Dialog title="Preparar un examen" onClose={closePanel}><StudyExamPlanner onDirtyChange={PanelDirty} detail={detail} busy={busy||!active} run={run}/></Dialog>}</>;}
function StudyCreationEditor({creation,onClose,onSave,disabled}:{creation:StudyCreation;onClose:()=>void;onSave:(title:string,body:string)=>Promise<unknown>;disabled:boolean}){const[editing,Editing]=useState(false);const[title,Title]=useState(creation.title);const[body,Body]=useState(creation.markdown??creation.body??'');const dirty=title!==creation.title||body!==(creation.markdown??creation.body);return <Dialog title="Tu creación" onClose={()=>{if(!dirty||window.confirm('Hay cambios sin guardar. ¿Querés salir?'))onClose();}}><div className={s.dialogBody}>{creation.sourceUnavailable&&<Notice>Una fuente ya no está disponible. Esta creación se conserva como historial.</Notice>}<button disabled={disabled&&!editing} onClick={()=>Editing(!editing)}>{editing?'Ver vista previa':'Editar texto'}</button>{editing?<><label>Título<input disabled={disabled} value={title} onChange={e=>Title(e.target.value)}/></label><label>Contenido<textarea className={s.creationEditor} disabled={disabled} value={body} onChange={e=>Body(e.target.value)} rows={16}/></label></>:<section aria-label="Vista previa de la creación"><h3>{title}</h3><FoxyMarkdown markdown={body}/></section>}<p role="status">{dirty?'Cambios sin guardar':'Creación privada'}</p><button className={s.primary} disabled={!dirty||disabled} onClick={()=>void onSave(title,body)}>Guardar creación</button></div></Dialog>;}
