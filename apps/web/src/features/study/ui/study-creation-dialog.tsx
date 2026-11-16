import {useEffect,useRef,useState} from 'react';
import {coverOptions} from '../../../../../shared-ui/academic-cover';
import {learningCover} from '../../../../../shared-ui/parity-assets';
import {WizardCurriculum,WizardPlanSource,type EditorUnit} from '../../../../../shared-ui/academic-plan';
import {AiProgress} from '../../../../../shared-ui/AiProgress';
import {FoxmindIcon} from '../../../../../shared-ui/FoxmindIcon';
import {Dialog,Notice} from '../../../../../shared-ui/feedback';
import {createStudyClient,validateStudyPlan,type StudyCollection,type StudyFolder,type StudyUnit} from '../api/study-client';
import {studyUploadRequest,type StudyUploadStatus} from '../api/study-upload-client';
import {requireStudyPlan,validateStudyUpload} from '../model/study-file-policy';

const api=createStudyClient();
const steps=[
  {label:'Tu carpeta',detail:'Nombre, materia y portada',heading:'Dale identidad a tu carpeta',description:'Elegí cómo vas a reconocer tu carpeta de estudio.'},
  {label:'El programa',detail:'Tu material o el plan de un aula',heading:'Todo empieza con una buena base',description:'Usá tu programa o aprovechá el recorrido de una de tus aulas.'},
  {label:'El recorrido',detail:'Unidades y temas a tu manera',heading:'Un recorrido para estudiar a tu ritmo',description:'Ajustá las unidades y los temas que querés estudiar.'},
  {label:'Todo listo',detail:'Una última mirada antes de crear',heading:'Tu carpeta está a un paso',description:'Revisá los detalles. Todavía podés cambiar lo que necesites.'},
];
type Operation='upload'|'check'|'import'|'analyze'|'save'|'create';
type PlanFile=Pick<StudyUploadStatus,'id'|'name'|'ready'>;

export function StudyWizard({catalog,folder,onClose,onCreated,onSaved}:{
  catalog:StudyCollection;folder?:StudyFolder;onClose:()=>void;onSaved?:()=>void;onCreated:(folder:StudyFolder)=>void;
}) {
  const [step,setStep]=useState(folder?.wizardStep??0),[name,setName]=useState(folder?.name??'');
  const [subject,setSubject]=useState(folder?.subject??'');
  const [year,setYear]=useState(String(folder?.academicYear??new Date().getFullYear()));
  const [banner,setBanner]=useState(folder?.bannerKey??'literature'),[linked,setLinked]=useState(folder?.linkedClassroomId??'');
  const [programSource,setProgramSource]=useState(folder?.linkedClassroomId?'classroom':'own');
  const [units,setUnits]=useState<StudyUnit[]>(folder?.units??[]);
  const [planId,setPlanId]=useState(folder?.planFileId??null);
  const [file,setFile]=useState<PlanFile|null>(folder?.planFileId?{id:folder.planFileId,name:'Documento del plan guardado',ready:false}:null);
  const [method,setMethod]=useState<'manual'|'ai'|'classroom'|null>(folder?.planOrigin?'classroom':null),[analysisFailed,setAnalysisFailed]=useState(false);
  const [operation,setOperation]=useState<Operation|null>(null),[error,setError]=useState('');
  const [dirty,setDirty]=useState(false),[saved,setSaved]=useState(!!folder),[leave,setLeave]=useState(false);
  const draft=useRef(folder),lock=useRef(false),fileVersion=useRef(0),heading=useRef<HTMLHeadingElement>(null);
  const blocked=operation!==null;
  useEffect(()=>{heading.current?.focus();},[step]);
  useEffect(()=>{
    if(!folder?.planFileId)return;
    const abort=new AbortController(),version=fileVersion.current;
    const current=()=>!abort.signal.aborted&&version===fileVersion.current;
    void studyUploadRequest(`/${folder.id}/uploads/${folder.planFileId}`,'GET',undefined,abort.signal)
      .then(result=>{if(current())setFile(result);})
      .catch(()=>{if(current())setError('No pudimos consultar el plan guardado. Volvé a consultar su estado.');});
    return ()=>abort.abort();
  },[folder?.id,folder?.planFileId]);
  useEffect(()=>{
    const before=(event:BeforeUnloadEvent)=>{if(dirty||blocked)event.preventDefault();};
    window.addEventListener('beforeunload',before);
    return ()=>window.removeEventListener('beforeunload',before);
  },[dirty,blocked]);

  async function ensureDraft(){
    if(draft.current)return draft.current;
    const result=await api.create({name:name||'Nueva carpeta',subject,wizardStep:step,academicYear:Number(year),bannerKey:banner,linkedClassroomId:linked||null,status:'DRAFT'});
    return draft.current=result.folder;
  }
  async function run(next:Operation,action:()=>Promise<void>){
    if(lock.current)return;
    lock.current=true;setOperation(next);setError('');
    try{await action();}
    catch(failure){
      if((next==='save'||next==='create'||next==='analyze'||next==='import')&&draft.current){
        try{draft.current=(await api.get(draft.current.id)).folder;}catch{/* Keep the last known revision. */}
      }
      setError(failure instanceof Error?failure.message:'No pudimos completar la acción.');
    }finally{lock.current=false;setOperation(null);}
  }
  function applyFile(result:StudyUploadStatus){
    setFile(result);setPlanId(result.ready?result.id:null);setDirty(true);
    if(result.rejectionCode||result.validation==='REJECTED'||['REJECTED','ERROR'].includes(result.scan)){
      setError('El archivo no fue aprobado. Elegí otro documento.');
    }
  }
  async function upload(chosen:File|undefined){
    if(!chosen||lock.current)return;
    const invalid=validateStudyUpload('plan',chosen);
    if(invalid){setError(invalid);return;}
    await run('upload',async()=>{
      fileVersion.current++;setFile(null);setPlanId(null);setDirty(true);
      const current=await ensureDraft(),path=`/${current.id}/uploads`;
      const begun=await studyUploadRequest(path,'POST',JSON.stringify({name:chosen.name,bytes:chosen.size,purpose:'plan'}));
      setFile({id:begun.id,name:chosen.name,ready:false});
      applyFile(await studyUploadRequest(`${path}/${begun.id}`,'PUT',chosen));
    });
  }
  function checkFile(){
    if(file&&draft.current)void run('check',async()=>{
      fileVersion.current++;
      applyFile(await studyUploadRequest(`/${draft.current!.id}/uploads/${file.id}`));
    });
  }
  async function selectedPlan(current:StudyFolder){
    if(programSource!=='classroom'||!linked||current.planOrigin?.classroomId===linked)return {folder:current,units};
    const result=await api.command(current.id,current.revision,'IMPORT_CLASSROOM_PLAN',{classroomId:linked});
    draft.current=result.folder;setUnits(result.folder.units);
    return {folder:result.folder,units:result.folder.units};
  }
  function save(active=false,exit=false){
    const invalid=active?((!subject.trim()?'Completá la materia para continuar.':null)??(draft.current?.planOrigin?null:requireStudyPlan(file?.ready?planId:null))??validateStudyPlan(name,year,units))
      :(!/^\d{1,4}$/.test(year)||Number(year)<1?'Revisá el año académico.':null);
    if(invalid){setError(invalid);return;}
    void run(active?'create':'save',async()=>{
      const savedDraft=await ensureDraft();
      const prepared=savedDraft.planOrigin?await selectedPlan(savedDraft):{folder:savedDraft,units},current=prepared.folder;
      const result=await api.update(current.id,{revision:current.revision,name,subject,wizardStep:step,academicYear:Number(year),bannerKey:banner,
        linkedClassroomId:linked||null,units:prepared.units,planFileId:planId,...(active?{status:'ACTIVE'}:{})});
      draft.current=result.folder;setDirty(false);setSaved(true);
      if(active)onCreated(result.folder);else if(exit)(onSaved??onClose)();
    });
  }
  function analyze(){
    if(lock.current||!file?.ready||!planId)return;
    setStep(2);setAnalysisFailed(false);
    void run('analyze',async()=>{
      try{
        const current=await ensureDraft();
        if(current.planFileId!==planId)draft.current=(await api.update(current.id,{revision:current.revision,planFileId:planId})).folder;
        const result=await api.command(current.id,draft.current!.revision,'GENERATE',{kind:'PLAN'});
        draft.current=result.folder;setUnits(result.folder.units);
      }catch(failure){setAnalysisFailed(true);throw failure;}
    });
  }
  function importPlan() {
    if (lock.current) return;
    if (draft.current?.planOrigin?.classroomId===linked) { goTo(2); return; }
    if (!linked) return;
    void run('import', async () => {
      await selectedPlan(await ensureDraft());
      setSaved(true); setDirty(true); setStep(2);
    });
  }
  function goTo(next:number){if(!blocked&&!leave){setError('');setStep(next);}}
  function advance(){
    if(lock.current||leave)return;
    if(step===3){save(true);return;}
    const invalid=step===0?((!subject.trim()?'Completá el nombre y la materia para continuar.':null)??validateStudyPlan(name,year,units,false))
      :step===1?((method==='classroom'||draft.current?.planOrigin?null:requireStudyPlan(file?.ready?planId:null))??(!method?'Elegí cómo querés cargar el plan.':null))
        :validateStudyPlan(name,year,units);
    if(invalid){setError(invalid);return;}
    if(step===1&&method==='ai'){analyze();return;}
    if(step===1&&method==='classroom'){importPlan();return;}
    if(step===2&&method==='ai'&&analysisFailed)return;
    goTo(step+1);
  }
  const editUnits:EditorUnit[]=units.map(unit=>({id:unit.id,name:unit.title,topics:unit.topics.map(topic=>({id:topic.id,name:topic.title}))}));
  const action=step===3?'Crear carpeta':step===1&&method==='ai'?'Preparar con Foxy':step===1&&method==='classroom'?'Revisar mi recorrido':step===1&&method==='manual'?'Armar mi recorrido':'Continuar';
  const status=operation?{upload:'Subiendo y validando el plan…',check:'Consultando el estado del plan…',import:'Copiando el plan del aula…',analyze:'Organizando unidades y temas…',
    save:'Guardando borrador…',create:'Creando tu carpeta…'}[operation]
    :dirty?'Cambios sin guardar':saved?'Borrador guardado':'La carpeta se activa sólo al confirmar.';
  return <Dialog title="Crear una carpeta" className="parity-classroom-wizard parity-study-wizard study-exact-wizard"
    onClose={()=>{if(!lock.current){if(dirty)setLeave(!leave);else onClose();}}}>
    <form className="class-wizard-form" data-wizard-step={step} aria-busy={blocked} onSubmit={event=>{event.preventDefault();advance();}}>
      <div className="class-builder">
        <aside className="class-builder-rail"><ol aria-label="Pasos de creación de la carpeta">{steps.map((item,index)=><li key={item.label} className={index===step?'current':index<step?'complete':''}><button type="button" disabled={blocked||leave||index>step} aria-current={index===step?'step':undefined} onClick={()=>goTo(index)}><span>{index<step?<FoxmindIcon name="check"/>:index+1}</span><div><b>{item.label}</b><small>{item.detail}</small></div></button></li>)}</ol><div className="class-builder-preview"><img src={learningCover(banner)} alt=""/><div><span>Así se va a ver tu carpeta</span><b>{name||'Tu próxima carpeta'}</b><small>{subject||'Un lugar para tus temas'}</small></div></div><p className="class-private"><FoxmindIcon name="lock"/>Tu borrador es sólo tuyo.</p></aside>
        <section className="class-builder-stage"><div className="class-step-heading"><span>Paso {step+1} de 4</span><h3 ref={heading} tabIndex={-1}>{steps[step].heading}</h3><p>{steps[step].description}</p></div>
        <div key={step} className="class-step-content">
          {error&&<Notice error>{error}</Notice>}
          {leave&&<Notice>Hay cambios sin guardar. <button type="button" autoFocus onClick={()=>setLeave(false)}>Seguir editando</button>{' '}
            <button type="button" onClick={onClose}>Salir sin guardar</button></Notice>}
          {operation==='analyze'?<AiProgress state="RUNNING" task="plan" hint="Vas a poder revisar y ajustar las unidades antes de crear tu carpeta."/>:
            <fieldset disabled={blocked||leave}>
              {step===0?<><div className="class-form-grid" data-creation-fields="folder">
                <label>Nombre de la carpeta<input autoFocus required placeholder="Por ejemplo: Fotografía y luz" maxLength={120} value={name}
                  onChange={event=>{setName(event.target.value);setDirty(true);}}/></label>
                <div className="class-form-pair"><label>Materia<input required maxLength={100} placeholder="Fotografía" value={subject} onChange={event=>{setSubject(event.target.value);setDirty(true);}}/></label><label>Año<input type="number" required min="1" max="9999" value={year}
                  onChange={event=>{setYear(event.target.value);setDirty(true);}}/></label></div>

              </div><StudyCoverPicker value={banner} onChange={value=>{setBanner(value);setDirty(true);}}/></>
                :step===1?<><fieldset className="study-exact-source-picker"><legend>¿De dónde parte tu recorrido?</legend><div><label><input type="radio" name="study-source" checked={programSource==='own'} onChange={()=>{setProgramSource('own');setLinked('');setMethod(null);setDirty(true);}}/>Sin aula</label><label><input type="radio" name="study-source" checked={programSource==='classroom'} onChange={()=>{setProgramSource('classroom');setMethod('classroom');setDirty(true);}}/>Vincular a mi aula</label></div></fieldset>
                  {programSource==='classroom'?<fieldset className="study-exact-methods study-exact-class-picker"><legend>Elegí un aula</legend><p>Copiá el recorrido y consultá sus materiales.</p>{catalog.classrooms.map(item=><label key={item.id}><input type="radio" name="study-classroom" checked={linked===item.id} onChange={()=>{setLinked(item.id);setMethod('classroom');setDirty(true);}}/><img src={learningCover()} alt=""/><span><b>{item.name}</b><small>{item.academicYear}{item.archived?' · Archivada · consulta':''}</small></span></label>)}{!catalog.classrooms.length&&<p>Todavía no tenés aulas disponibles. Podés seguir con la opción Sin aula.</p>}</fieldset>:<>
                    <WizardPlanSource file={file} uploading={operation==='upload'||operation==='check'} disabled={blocked||leave}
                      fileUrl={id=>`/api/v1/study-folders/${draft.current!.id}/uploads/${id}/file?mode=download`} onFile={upload}
                      onError={setError} onRefresh={checkFile} onRemoveFile={()=>{fileVersion.current++;setFile(null);setPlanId(null);setError('');setDirty(true);}}/>
                    <fieldset className="study-exact-methods" disabled={!file?.ready}><legend>¿Cómo querés preparar el recorrido?</legend><p>Elegí el punto de partida. Vas a poder editar todo después.</p>
                      <label><input type="radio" name="plan-method" value="ai" checked={method==='ai'} onChange={()=>{setMethod('ai');setDirty(true);}}/><span className="study-exact-tool-icon peach"><FoxmindIcon name="spark"/></span><span><b>Prepararlo con Foxy</b><small>Una propuesta de unidades y temas a partir de tu programa.</small></span></label>
                      <label><input type="radio" name="plan-method" value="manual" checked={method==='manual'} onChange={()=>{setMethod('manual');setDirty(true);}}/><span className="study-exact-tool-icon sky"><FoxmindIcon name="edit"/></span><span><b>Armarlo a mano</b><small>Organizá las unidades y los temas a tu manera.</small></span></label>
                    </fieldset>{!file?.ready&&<p className="study-exact-field-hint">Primero cargá el programa para elegir cómo seguir.</p>}
                  </>}</>
                :step===2?(method==='ai'&&analysisFailed?<><button type="button" onClick={analyze}>Reintentar análisis</button>{' '}
                  <button type="button" onClick={()=>{setMethod('manual');setError('');}}>Continuar manualmente</button></>:
                  <WizardCurriculum units={editUnits} orderHint="El orden de las unidades será tu recorrido de estudio."
                    maxTopicsPerUnit={200} maxTopics={Infinity} onUnits={next=>{
                      setUnits(next.map(unit=>({id:unit.id??crypto.randomUUID(),title:unit.name,
                        topics:unit.topics.map(topic=>({id:topic.id??crypto.randomUUID(),title:topic.name}))})));setDirty(true);
                    }}/>)
                :<div className="study-exact-wizard-review"><div className="study-exact-review-card"><img src={learningCover(banner)} alt=""/><div><span>{subject}</span><h4>{name}</h4><p>Año {year}</p></div><button type="button" onClick={()=>goTo(0)}><FoxmindIcon name="edit"/>Editar</button></div>{linked&&<div className="study-exact-ready-note"><FoxmindIcon name="book"/><div><b>{catalog.classrooms.find(item=>item.id===linked)?.name??'Aula vinculada'}</b><p>Vas a poder consultar los materiales actualizados del aula. Los tuyos quedan en tu carpeta privada.</p></div><button type="button" onClick={()=>goTo(1)}>Editar vínculo</button></div>}<div className="study-exact-review-head"><div><h4>Tu recorrido de estudio</h4><p>{units.length} {units.length===1?'unidad':'unidades'} · {units.reduce((sum,unit)=>sum+unit.topics.length,0)} temas</p></div><button type="button" onClick={()=>goTo(2)}><FoxmindIcon name="edit"/>Editar plan</button></div><ol className="study-exact-plan-summary">{units.map((unit,index)=><li key={unit.id}><span>{index+1}</span><div><b>{unit.title}</b><p>{unit.topics.map(topic=>topic.title).join(' · ')}</p></div></li>)}</ol><div className="study-exact-ready-note"><FoxmindIcon name="lock"/><p>Vas a encontrar tu carpeta en Mi estudio. Sólo vos podés ver sus materiales y conversaciones.</p></div></div>}

            </fieldset>}
        </div>
        <p className="brujula-wizard-save" role="status">{operation&&<span className="wizard-spinner" aria-hidden="true"/>}{status}</p>
        </section>
      </div>
        <footer className="dialog-footer brujula-wizard-foot">
          <button type="button" className="brujula-wizard-keep class-save" disabled={blocked||leave} onClick={()=>save(false,true)}><FoxmindIcon name="check"/>Guardar y salir</button>
          <div className="class-step-actions">{step>0&&<button type="button" disabled={blocked||leave} onClick={()=>goTo(step-1)}>Atrás</button>}
            <button type="submit" className="primary" disabled={blocked||leave||step===1&&(programSource==='classroom'?!linked:!file?.ready||!method)||step===2&&method==='ai'&&analysisFailed}>
              <FoxmindIcon name="arrow-right"/>{operation==='create'?'Creando carpeta…':operation==='analyze'?'Analizando plan…':action}
            </button>
          </div>
        </footer>
    </form>
  </Dialog>;
}

function StudyCoverPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const primary=[{key:'literature',label:'Creatividad'},{key:'biology',label:'Naturaleza'},{key:'math',label:'Ideas y números'}];
 const current=coverOptions(value).find(item=>item.key===value);
 const visible=[...primary,...(current&&!primary.some(item=>item.key===current.key)?[current]:[])];
 return <fieldset className="class-cover-picker"><legend>Una portada para reconocerla</legend><div>{visible.map(cover=><label className="class-cover-option" key={cover.key}><img src={learningCover(cover.key)} alt=""/><span><input type="radio" name="coverKey" checked={value===cover.key} onChange={()=>onChange(cover.key)}/>{cover.label}<FoxmindIcon name="check"/></span></label>)}</div></fieldset>;
}
