import type { StudyRun } from '../model/study-commands.ts';
import { studyFolderSettings } from '../folders/study-folder-persistence.ts';
import { useEffect, useId, useRef, useState } from 'react';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyCollection, StudyDetail } from '../model/study-contracts.ts';
import { validateStudyPlan } from '../model/study-transitions.ts';
import { canManageStudyMaterial } from '../model/study-discovery';
import { StudyUpload } from './study-upload';
import { StudyPlanEditor } from './study-wizard';
import { StudyDocxPreview } from './study-docx-preview';
import { StudyConfirmation } from './study-confirmation';
import s from './study.module.css';

type Run=StudyRun;
type Topic = StudyDetail['folder']['units'][number]['topics'][number];

function StudyFileLinks({href,plan=false,onPreview}:{href:string;plan?:boolean;onPreview?:()=>void}) {
  return <div className={s.fileLinks}>
    {onPreview
      ? <button type="button" className={s.previewButton} onClick={onPreview}>{plan?'Abrir plan':'Abrir archivo'}</button>
      : <a href={href+'?mode=preview'} target="_blank" rel="noopener noreferrer">{plan?'Abrir plan':'Abrir archivo'}</a>}
    <a href={href+'?mode=download'}>{plan?'Descargar plan':'Descargar'}</a>
    {!onPreview && <small>Los archivos sin vista previa se descargan.</small>}
  </div>;
}

export function StudyMaterials({ detail, catalog, busy, run, onReload, onDirtyChange, onStudyTopic }: {
  detail: StudyDetail; catalog: StudyCollection; busy: boolean; run: Run;
  onReload: () => Promise<unknown>; onDirtyChange: (value: boolean) => void;
  onStudyTopic: (topic: Topic) => void;
}) {
  const folder = detail.folder;
  const [units, setUnits] = useState(folder.units);
  const [link, setLink] = useState(folder.linkedClassroomId ?? '');
  const [tab, setTab] = useState<'materials' | 'plan'>('materials');
  const [settings, setSettings] = useState(false);
  const [materialOpen, setMaterialOpen] = useState('');
  const [unitOpen, setUnitOpen] = useState('');
  const detailsId = useId();
  const [upload, setUpload] = useState(false);
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState<{ fileId: string; title: string }>();
  const [editMaterial, setEditMaterial] = useState('');
  const [preview, setPreview] = useState<{sourceId: string; title: string; href: string}>();
  const [removal, setRemoval] = useState<{id: string; title: string}>();
  const searchMaterial = useRef<HTMLInputElement>(null);
  const writable = folder.status === 'ACTIVE' && !busy && !working;
  const materials = detail.sources.filter(source => source.kind !== 'PLAN');
  const found = materials.filter(source => (!origin || source.origin === origin) &&
    source.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const editing = folder.materials?.find(material => material.id === editMaterial);
  const planHref = folder.planFileId && `/api/v1/study-folders/${folder.id}/uploads/${folder.planFileId}/file`;
  const plan = detail.sources.find(source => source.kind === 'PLAN' && source.fileId === folder.planFileId);
  const topicCount = folder.units.reduce((total, unit) => total + unit.topics.length, 0);

  useEffect(() => onDirtyChange(dirty || working), [dirty, working, onDirtyChange]);

  async function addMaterial(material: { fileId: string; title: string }) {
    setWorking(false);
    setError('');
    setPendingMaterial(material);
    try {
      await run('ADD_MATERIAL', material);
      setPendingMaterial(undefined);
      setUpload(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'El archivo está listo. Volvé a intentar agregarlo a la carpeta.');
    }
  }

  async function save() {
    const invalid = validateStudyPlan(folder.name, String(folder.academicYear), units);
    if (invalid) { setError(invalid); return; }
    if (link !== (folder.linkedClassroomId ?? '') && !window.confirm('Cambiar el vínculo deja de usar los materiales del aula anterior. ¿Querés continuar?')) return;
    setWorking(true);
    try {
      await studyFolderSettings.save(folder.id, { revision: folder.revision, units, linkedClassroomId: link || null });
      await onReload();
      setDirty(false);
      setSettings(false);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos guardar los cambios.');
    } finally { setWorking(false); }
  }

  return <div className={`${s.dialogBody} ${s.materialsPanel}`}>
    <div className={s.materialsHeading}>
      <div><small>{folder.name} · Sólo para vos</small><h3>Tu material de estudio</h3></div>
      <button className={s.primary} type="button" disabled={!writable} onClick={() => {
        setTab('materials');
        setUpload(value => !value);
      }}>{upload ? 'Cerrar carga' : 'Agregar material'}</button>
    </div>
    <nav className={s.materialTabs} aria-label="Materiales y plan">
      <button type="button" aria-current={tab === 'materials' ? 'page' : undefined} onClick={() => setTab('materials')}>Materiales <small>{materials.length}</small></button>
      <button type="button" aria-current={tab === 'plan' ? 'page' : undefined} onClick={() => setTab('plan')}>Plan de estudio <small>{folder.units.length} {folder.units.length === 1 ? 'unidad' : 'unidades'}</small></button>
    </nav>
    {error && <Notice error>{error}</Notice>}
    {tab === 'materials' ? <>
      {upload && <section className={s.materialUpload} aria-label="Agregar material">
        <p>El archivo quedará en tu carpeta privada. Si Foxy puede leerlo, estará disponible para futuras consultas.</p>
        {pendingMaterial ? <button disabled={!writable} type="button" onClick={() => void addMaterial(pendingMaterial)}>
          {busy ? 'Guardando material…' : 'Reintentar agregar a la carpeta'}
        </button> : <StudyUpload purpose="material" ensureFolder={async () => folder} onBusyChange={setWorking}
          onReady={(fileId, title) => { void addMaterial({ fileId, title }); }}/>}
      </section>}
      <div className={s.materialFilters}>
        <label>Buscar material<input ref={searchMaterial} type="search" placeholder="Nombre del material" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <label>Procedencia<select value={origin} onChange={event => setOrigin(event.target.value)}>
          <option value="">Todas</option><option value="OWN">Propio</option><option value="CLASSROOM">Aula vinculada</option>
        </select></label>
      </div>
      <p className={s.materialNote}>Los materiales legibles se pueden usar en tus consultas. Los del aula vinculada dependen de tu acceso actual.</p>
      {!found.length && <p className={s.materialNote}>{materials.length ? 'No hay materiales con esos filtros.' : 'Todavía no tenés materiales en esta carpeta.'}</p>}
      <div className={s.materialRows}>{found.map(source => {
        const manage = canManageStudyMaterial(folder, source);
        const href = source.origin === 'OWN' ? `/api/v1/study-folders/${folder.id}/uploads/${source.fileId}/file`
          : `/api/v1/files/${source.fileId}/content`;
        const open = materialOpen === source.id;
        const actionsId = `${detailsId}-material-${source.id}`;
        return <article className={s.materialRow} key={source.id}>
          <div className={s.materialRowHeader}>
            <span className={s.fileBadge} aria-hidden="true">{source.origin === 'OWN' ? 'DOC' : 'AULA'}</span>
            <span><strong>{source.title}</strong><small>{source.origin === 'OWN' ? 'Material propio' : 'Aula vinculada'}</small>
              <small className={source.available && source.readable !== false ? s.readable : s.savedOnly}>
                {!source.available ? 'Sin acceso' : source.readable === false ? 'Guardado · sin lectura IA' : 'Disponible para Foxy'}
              </small>
            </span><button type="button" className={s.materialDetailLabel} aria-label={`Ver detalles: ${source.title}`}
              aria-expanded={open} aria-controls={actionsId} onClick={() => setMaterialOpen(open ? '' : source.id)}>Ver detalles</button>
          </div>
          <div id={actionsId} hidden={!open}>{open && <div className={s.actions}>
            {source.available && <StudyFileLinks href={href} onPreview={source.extension === 'docx'
              ? () => setPreview({ sourceId: source.id, title: source.title, href }) : undefined}/>}
            {manage && <button disabled={!writable} type="button" onClick={() => setEditMaterial(source.id)}>Editar material</button>}
            {manage && <button disabled={!writable} type="button" onClick={() => setRemoval({ id: source.id, title: source.title })}>Quitar</button>}
          </div>}</div>
        </article>;
      })}</div>
      {editing && <StudyMaterialEditor key={editing.id} material={editing} units={folder.units} busy={!writable}
        onDirtyChange={onDirtyChange} onClose={() => setEditMaterial('')} onSave={async (title, topicIds) => {
          try {
            await run('EDIT_MATERIAL', { materialId: editing.id, title, topicIds });
            onDirtyChange(false);
            setEditMaterial('');
          } catch { /* The workspace shows the server error. */ }
        }}/>}
    </> : <>
      <div className={s.planDocument}><div><strong>Plan de {folder.name}</strong>
        {folder.planOrigin && <small>Copia editable de un plan de aula</small>}
        <small>{folder.units.length} {folder.units.length === 1 ? 'unidad' : 'unidades'} · {topicCount} {topicCount === 1 ? 'tema' : 'temas'}</small></div>
        {planHref && <StudyFileLinks href={planHref} plan onPreview={plan?.extension === 'docx'
          ? () => setPreview({ sourceId: plan.id, title: plan.title, href: planHref }) : undefined}/>}
      </div>
      {folder.units.map(unit => {
        const open = unitOpen === unit.id;
        const topicsId = `${detailsId}-unit-${unit.id}`;
        return <section className={s.planUnit} key={unit.id}>
          <div className={s.planUnitHeader}>
            <div><strong>{unit.title}</strong><small>{unit.topics.length} {unit.topics.length === 1 ? 'tema' : 'temas'}</small></div>
            <button type="button" aria-label={`Ver temas: ${unit.title}`} aria-expanded={open} aria-controls={topicsId}
              onClick={() => setUnitOpen(open ? '' : unit.id)}>Ver temas</button>
          </div>
          <div id={topicsId} hidden={!open}>{open && <ul>{unit.topics.map(topic => <li key={topic.id}><span>{topic.title}</span>
            <button disabled={!writable} type="button" onClick={() => onStudyTopic(topic)}>Estudiar →</button>
          </li>)}</ul>}</div>
        </section>;
      })}
    </>}
    <button type="button" aria-expanded={settings} disabled={!writable || !!editing} onClick={() => setSettings(value => !value)}>
      {settings ? 'Ocultar configuración' : 'Editar plan o aula vinculada'}
    </button>
    {settings && <fieldset disabled={!writable} className={s.materialUpload}>
      <label>Aula vinculada<select value={link} onChange={event => { setLink(event.target.value); setDirty(true); }}>
        <option value="">Sin aula vinculada</option>{catalog.classrooms.map(room => <option key={room.id} value={room.id}>{room.name}{room.archived?' · Archivada · consulta':''}</option>)}
      </select></label>
      <StudyPlanEditor units={units} onChange={value => { setUnits(value); setDirty(true); }}/>
      <StudyUpload purpose="plan" ensureFolder={async () => folder} onReady={id => {
        setWorking(true);
        void studyFolderSettings.setPlan(folder.id, folder.revision, id)
          .then(onReload).catch((failure: Error) => setError(failure.message)).finally(() => setWorking(false));
      }}/>
      <button className={s.primary} disabled={!dirty} type="button" onClick={() => void save()}>Guardar cambios</button>
    </fieldset>}
    {preview && <StudyDocxPreview folderId={folder.id} sourceId={preview.sourceId} title={preview.title}
      downloadHref={preview.href+'?mode=download'} onClose={() => setPreview(undefined)}/>}
    {removal && <StudyConfirmation title="Quitar material" confirmLabel="Quitar material" destructive busy={!writable}
      description={`«${removal.title}» se quitará de la carpeta y Foxy dejará de usarlo en nuevas consultas.`}
      onClose={() => setRemoval(undefined)} onConfirm={async () => {
        await run('REMOVE_MATERIAL', { materialId: removal.id });
        requestAnimationFrame(() => searchMaterial.current?.focus());
      }}/>}
  </div>;
}

function StudyMaterialEditor({material,units,busy,onClose,onSave,onDirtyChange}:{material:{title:string;topicIds:string[]};units:StudyDetail['folder']['units'];busy:boolean;onClose:()=>void;onSave:(title:string,topicIds:string[])=>Promise<unknown>;onDirtyChange:(v:boolean)=>void}){const[title,Title]=useState(material.title);const[topicIds,Topics]=useState(material.topicIds);const[error,SetError]=useState('');const dirty=title!==material.title||JSON.stringify(topicIds)!==JSON.stringify(material.topicIds);useEffect(()=>onDirtyChange(dirty),[dirty,onDirtyChange]);return <section className={s.unit}><h3>Editar material propio</h3><label>Título del material<input disabled={busy} value={title} onChange={e=>Title(e.target.value)}/></label><fieldset disabled={busy}><legend>Temas relacionados</legend>{units.flatMap(u=>u.topics).map(t=><label className={s.check} key={t.id}><input type="checkbox" checked={topicIds.includes(t.id)} onChange={e=>Topics(e.target.checked?[...topicIds,t.id]:topicIds.filter(id=>id!==t.id))}/>{t.title}</label>)}</fieldset>{error&&<Notice error>{error}</Notice>}<div className={s.actions}><button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Hay cambios del material sin guardar. ¿Querés cancelarlos?')){onDirtyChange(false);onClose();}}}>Cancelar edición</button><button className={s.primary} disabled={busy||!dirty} onClick={()=>{if(!title.trim()||[...title.trim()].length>120){SetError('Escribí un título de entre 1 y 120 caracteres.');return;}void onSave(title.trim(),topicIds);}}>Guardar material</button></div><p role="status">{dirty?'Cambios sin guardar':'Material privado'}</p></section>;}
