import {useEffect,useRef,useState} from 'react';
import {WizardCover} from '../../../../../shared-ui/academic-cover';
import {CreationSteps} from '../../../../../shared-ui/CreationSteps';
import {CreationReview} from '../../../../../shared-ui/CreationReview';
import {WizardCurriculum,WizardPlanSource,type EditorUnit} from '../../../../../shared-ui/academic-plan';
import {AiProgress} from '../../../../../shared-ui/AiProgress';
import {FoxmindIcon} from '../../../../../shared-ui/FoxmindIcon';
import {Dialog,Notice} from '../../../../../shared-ui/feedback';
import styles from '../../../../../shared-ui/academic-creation.module.css';
import {createStudyClient,validateStudyPlan,type StudyCollection,type StudyFolder,type StudyUnit} from '../api/study-client';
import {studyUploadRequest,type StudyUploadStatus} from '../api/study-upload-client';
import {requireStudyPlan,validateStudyUpload} from '../model/study-file-policy';

const api=createStudyClient();
const steps=[
  {label:'Datos de la carpeta',heading:'Dale un lugar a lo que estás estudiando',description:'Completá los datos de tu carpeta privada y elegí su portada.'},
  {label:'Cargar plan',heading:'Tu plan, listo para estudiar',description:'Cargá el documento y elegí cómo querés organizarlo.'},
  {label:'Unidades y temas',heading:'Revisá las unidades y los temas',description:'Podés ajustar los nombres, agregar temas y seguir cuando estén listos.'},
  {label:'Revisar y crear',heading:'Todo listo para empezar',description:'Comprobá los datos y creá tu carpeta de estudio. Sólo vos podés verla.'},
];
type Operation='upload'|'check'|'analyze'|'save'|'create';
type PlanFile=Pick<StudyUploadStatus,'id'|'name'|'ready'>;

export function StudyWizard({catalog,folder,onClose,onCreated}:{
  catalog:StudyCollection;folder?:StudyFolder;onClose:()=>void;onCreated:(folder:StudyFolder)=>void;
}) {
  const [step,setStep]=useState(0),[name,setName]=useState(folder?.name??'');
  const [year,setYear]=useState(String(folder?.academicYear??new Date().getFullYear()));
  const [banner,setBanner]=useState(folder?.bannerKey??'general'),[linked,setLinked]=useState(folder?.linkedClassroomId??'');
  const [units,setUnits]=useState<StudyUnit[]>(folder?.units??[]);
  const [planId,setPlanId]=useState(folder?.planFileId??null);
  const [file,setFile]=useState<PlanFile|null>(folder?.planFileId?{id:folder.planFileId,name:'Documento del plan guardado',ready:false}:null);
  const [method,setMethod]=useState<'manual'|'ai'|null>(null),[analysisFailed,setAnalysisFailed]=useState(false);
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
    const result=await api.create({name:name||'Nueva carpeta',academicYear:Number(year),bannerKey:banner,status:'DRAFT'});
    return draft.current=result.folder;
  }
  async function run(next:Operation,action:()=>Promise<void>){
    if(lock.current)return;
    lock.current=true;setOperation(next);setError('');
    try{await action();}
    catch(failure){
      if((next==='save'||next==='create'||next==='analyze')&&draft.current){
        try{draft.current=(await api.get(draft.current.id)).folder;}catch{/* Keep the last known revision. */}
      }
      setError(failure instanceof Error?failure.message:'No pudimos completar la acción.');
    }finally{lock.current=false;setOperation(null);}
  }
  function applyFile(result:StudyUploadStatus){
    setFile(result);setPlanId(result.ready?result.id:null);setDirty(true);
    if(result.rejectionCode||result.validation==='REJECTED'||['REJECTED','ERROR'].includes(result.scan)){
      setError('El archivo no fue aprobado. Elegí otro PDF o DOCX.');
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
  function save(active=false){
    const invalid=active?(requireStudyPlan(file?.ready?planId:null)??validateStudyPlan(name,year,units))
      :(!/^\d{1,4}$/.test(year)||Number(year)<1?'Revisá el año académico.':null);
    if(invalid){setError(invalid);return;}
    void run(active?'create':'save',async()=>{
      const current=await ensureDraft();
      const result=await api.update(current.id,{revision:current.revision,name,academicYear:Number(year),bannerKey:banner,
        linkedClassroomId:linked||null,units,planFileId:planId,...(active?{status:'ACTIVE'}:{})});
      draft.current=result.folder;setDirty(false);setSaved(true);
      if(active)onCreated(result.folder);
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
  function goTo(next:number){if(!blocked&&!leave){setError('');setStep(next);}}
  function advance(){
    if(lock.current||leave)return;
    if(step===3){save(true);return;}
    const invalid=step===0?validateStudyPlan(name,year,units,false)
      :step===1?requireStudyPlan(file?.ready?planId:null)??(!method?'Elegí si querés analizar el plan con IA o cargar las unidades manualmente.':null)
        :validateStudyPlan(name,year,units);
    if(invalid){setError(invalid);return;}
    if(step===1&&method==='ai'){analyze();return;}
    if(step===2&&method==='ai'&&analysisFailed)return;
    goTo(step+1);
  }
  const editUnits:EditorUnit[]=units.map(unit=>({id:unit.id,name:unit.title,topics:unit.topics.map(topic=>({id:topic.id,name:topic.title}))}));
  const action=step===0?'Continuar al plan':step===1?(method==='ai'?'Analizar plan y continuar':'Continuar a unidades')
    :step===2?'Continuar a revisión':'Confirmar y crear carpeta';
  const status=operation?{upload:'Subiendo y validando el plan…',check:'Consultando el estado del plan…',analyze:'Organizando unidades y temas…',
    save:'Guardando borrador…',create:'Creando tu carpeta…'}[operation]
    :dirty?'Cambios sin guardar':saved?'Borrador guardado':'La carpeta se activa sólo al confirmar.';
  return <Dialog title="Crear carpeta" className={`brujula-wizard-dialog ${styles.dialog}`}
    onClose={()=>{if(!lock.current){if(dirty)setLeave(!leave);else onClose();}}}>
    <div className="brujula-wizard">
      <CreationSteps steps={steps.map(item=>item.label)} step={step} label="Pasos de creación de la carpeta"/>
      <div className={styles.intro}><h3 ref={heading} tabIndex={-1}>{steps[step].heading}</h3><p>{steps[step].description}</p></div>
      <form data-wizard-step={step} aria-busy={blocked} onSubmit={event=>{event.preventDefault();advance();}}>
        <div key={step} className={styles.stepBody}>
          {error&&<Notice error>{error}</Notice>}
          {leave&&<Notice>Hay cambios sin guardar. <button type="button" autoFocus onClick={()=>setLeave(false)}>Seguir editando</button>{' '}
            <button type="button" onClick={onClose}>Salir sin guardar</button></Notice>}
          {operation==='analyze'?<AiProgress state="RUNNING" task="plan" hint="Vas a poder revisar y ajustar las unidades antes de crear tu carpeta."/>:
            <fieldset disabled={blocked||leave}>
              {step===0?<><div className="p5-fields" data-creation-fields="folder">
                <label>Nombre de la carpeta<input autoFocus required placeholder="Ej. Biología" value={name}
                  onChange={event=>{setName(event.target.value);setDirty(true);}}/></label>
                <label>Año académico<input type="number" required min="1" max="9999" value={year}
                  onChange={event=>{setYear(event.target.value);setDirty(true);}}/></label>
                <label>Aula vinculada (opcional)<select value={linked} onChange={event=>{setLinked(event.target.value);setDirty(true);}}>
                  <option value="">Sólo materiales propios</option>{catalog.classrooms.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
                </select><small>Te da acceso a los materiales disponibles de su Biblioteca.</small></label>
              </div><WizardCover label="Portada de la carpeta" payload={{coverKey:banner}} onUpdate={(_key,value)=>{setBanner(String(value));setDirty(true);}}/></>
                :step===1?<><WizardPlanSource file={file} uploading={operation==='upload'||operation==='check'} disabled={blocked||leave}
                  fileUrl={id=>`/api/v1/study-folders/${draft.current!.id}/uploads/${id}/file?mode=download`} onFile={upload}
                  onError={setError} onRefresh={checkFile} onRemoveFile={()=>{fileVersion.current++;setFile(null);setPlanId(null);setError('');setDirty(true);}}/>
                  <fieldset className={styles.method}><legend>Elegí cómo cargar las unidades y temas</legend>
                    <label><input type="radio" name="plan-method" value="ai" checked={method==='ai'} onChange={()=>setMethod('ai')}/>
                      <FoxmindIcon name="spark"/><span><strong>Analizar con IA</strong><small>Foxy extrae la estructura del documento. Podés corregirla antes de crear la carpeta.</small></span></label>
                    <label><input type="radio" name="plan-method" value="manual" checked={method==='manual'} onChange={()=>setMethod('manual')}/>
                      <FoxmindIcon name="edit"/><span><strong>Cargar manualmente</strong><small>Agregá tus unidades y temas sin analizar el archivo con IA.</small></span></label>
                  </fieldset></>
                :step===2?(method==='ai'&&analysisFailed?<><button type="button" onClick={analyze}>Reintentar análisis</button>{' '}
                  <button type="button" onClick={()=>{setMethod('manual');setError('');}}>Continuar manualmente</button></>:
                  <WizardCurriculum units={editUnits} orderHint="El orden de las unidades será tu recorrido de estudio."
                    maxTopicsPerUnit={200} maxTopics={Infinity} onUnits={next=>{
                      setUnits(next.map(unit=>({id:unit.id??crypto.randomUUID(),title:unit.name,
                        topics:unit.topics.map(topic=>({id:topic.id??crypto.randomUUID(),title:topic.name}))})));setDirty(true);
                    }}/>)
                :<CreationReview label="Resumen de la carpeta" title={name} cover={banner} fileName={file?.name} units={editUnits} edit={goTo}
                  details={<><p>{year} · {catalog.classrooms.find(item=>item.id===linked)?.name??'Materiales propios'}</p><p>Carpeta privada</p></>}/>}
            </fieldset>}
        </div>
        <p className="brujula-wizard-save" role="status">{operation&&<span className="wizard-spinner" aria-hidden="true"/>}{status}</p>
        <footer className="brujula-wizard-foot">
          <button type="button" className="brujula-wizard-keep" disabled={blocked||leave} onClick={()=>save()}>Guardar borrador</button>
          <div>{step>0&&<button type="button" disabled={blocked||leave} onClick={()=>goTo(step-1)}>Atrás</button>}
            <button type="submit" className="primary" disabled={blocked||leave||step===2&&method==='ai'&&analysisFailed}>
              {operation==='create'?'Creando carpeta…':operation==='analyze'?'Analizando plan…':action}
            </button>
          </div>
        </footer>
      </form>
    </div>
  </Dialog>;
}
