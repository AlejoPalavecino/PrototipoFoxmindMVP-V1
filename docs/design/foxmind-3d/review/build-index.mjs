import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const design = path.dirname(root);
const documents = ['account-and-navigation', 'classrooms-and-membership', 'classroom-workspace', 'activity-authoring', 'submissions-and-grading', 'agenda'];
const family = {
  NAV: 'Inicio', AUTH: 'Acceso', ACC: 'Cuenta', HOME: 'Inicio', CLASS: 'Aulas',
  PLAN: 'Plan de estudio', LIB: 'Biblioteca', WALL: 'Muro', PEOPLE: 'Participantes',
  ACT: 'Autoría manual', AI: 'Autoría con IA', SUB: 'Resolución y entrega', GRADE: 'Corrección y resultados', PROG: 'Progreso', AGENDA: 'Agenda',
};
const families = {
  'NAV-02':'Notificaciones', 'CLASS-02':'Crear aula · Datos', 'CLASS-03':'Crear aula · Archivo', 'CLASS-04':'Crear aula · IA', 'CLASS-05':'Crear aula · Unidades', 'CLASS-06':'Crear aula · Revisión',
  'CLASS-07':'Ingreso e invitaciones','CLASS-08':'Ingreso e invitaciones','CLASS-09':'Plan de estudio','CLASS-10':'Participantes','CLASS-11':'Ingreso e invitaciones','CLASS-12':'Ingreso e invitaciones','CLASS-13':'Participantes','CLASS-14':'Configuración del aula','CLASS-15':'Plan de estudio',
  'ACT-01':'Actividades','ACT-03':'Autoría · Trabajo práctico','ACT-04':'Autoría · Preguntas','ACT-05':'Autoría · Plazo','ACT-06':'Publicación','ACT-07':'Autoría · Contenido bloqueado',
  'SUB-03':'Resolución · Preguntas','SUB-04':'Resolución · Trabajo práctico','SUB-05':'Transferencia de edición','SUB-06':'Confirmación y comprobante','SUB-07':'Historial y reentrega','SUB-08':'Habilitación individual',
  'GRADE-04':'Resultado publicado','GRADE-05':'Notificaciones','PROG-03':'Progreso individual',
  'AGENDA-04':'Evento privado','AGENDA-05':'Evento privado','AGENDA-06':'Evento privado','AGENDA-07':'Evento privado','AGENDA-08':'Evento privado','AGENDA-09':'Evento privado',
};
const variantsFor = id => {
  if (id === 'ACT-01') return ['teacher','student'];
  if (id === 'PROG-01') return ['student'];
  if (['PLAN-02','PLAN-03','PLAN-04','LIB-02','LIB-03','LIB-04','LIB-05','PEOPLE-02','PEOPLE-03','PROG-02','PROG-03'].includes(id)) return ['teacher'];
  if (id === 'SUB-07') return ['tp','quiz','exam','teacher-tp','teacher-quiz','teacher-exam'];
  if (['HOME-01','HOME-02','NAV-01'].includes(id)) return ['study','teach','mixed','none'];
  if (id === 'ACT-03' || id === 'SUB-04') return ['tp'];
  if (['ACT-04','SUB-03'].includes(id)) return ['quiz','exam'];
  if (/^(ACT|AI|SUB|GRADE)-/.test(id) && id !== 'GRADE-05') return ['tp','quiz','exam'];
  if (/^(PLAN|LIB|WALL|PEOPLE|PROG)-/.test(id) || ['CLASS-09','CLASS-10','CLASS-13','CLASS-15'].includes(id)) return ['teacher','student'];
  return ['default'];
};
const statesFor = id => {
  if (id === 'AI-02') return ['normal','queued','running','ready','failed','stale','applied','unknown','loading','error','readonly','unavailable'];
  if (id === 'AI-05') return ['normal','error','unknown','stale','readonly','conflict','unavailable'];
  if (['CLASS-02','CLASS-03','CLASS-06'].includes(id)) return ['normal','loading','error','conflict','success'];
  if (['CLASS-04','CLASS-05'].includes(id)) return ['normal','loading','empty','error','conflict','success'];
  if (/^AUTH-/.test(id)) return ['normal','loading','error','success'];
  if (/^ACC-/.test(id)) return ['normal','loading','error','success'];
  if (/^AGENDA-/.test(id)) return ['normal','loading','empty','error','success','conflict'];
  if (/^(HOME|NAV)-/.test(id)) return ['normal','loading','empty','error','unavailable'];
  return ['normal','loading','empty','error','readonly','conflict','success','unavailable'];
};
const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s/g,'-');
const index = [];
for (const doc of documents) {
  const source = fs.readFileSync(path.join(design,'flows',doc+'.md'),'utf8');
  for (const match of source.matchAll(/^## (([A-Z]+)-\d+) — (.+)$/gm)) {
    const [heading,id,prefix,title] = match;
    const sourceDoc = `../flows/${doc}.md#${slug(heading.slice(3))}`;
    const variants = variantsFor(id);
    const states = statesFor(id);
    const frame = `screens.html#${id}/${variants[0]}/normal`;
    const next = source.indexOf('\n## ', match.index + heading.length);
    const body = source.slice(match.index + heading.length,next < 0 ? source.length : next).trim();
    index.push({ id,title,sourceDoc,family:families[id]||family[prefix],domain:doc,frame,hash:frame.split('#')[1],variants,states,composition:families[id]||family[prefix],reviewNote:body.split('\n\n')[0].replace(/\*\*/g,'') });
  }
}
const manifest = JSON.parse(fs.readFileSync(path.join(design,'asset-manifest.json'),'utf8'));
const vectors = JSON.parse(fs.readFileSync(path.join(design,'vector-manifest.json'),'utf8'));
const icons = vectors.assets.filter(asset=>asset.id.startsWith('icons/')&&asset.id!=='icons/sprite');
const brands = fs.readdirSync(path.join(design,'assets','brand')).filter(f=>f.endsWith('.svg')).map(name=>({ id:'brand/'+name.replace('.svg',''), default:'assets/brand/'+name,description:'Marca vectorial · '+name,variants:[] }));
fs.writeFileSync(path.join(root,'screen-index.json'),JSON.stringify(index,null,2)+'\n');
fs.writeFileSync(path.join(root,'review-data.js'),'window.FOX_REVIEW = '+JSON.stringify({screens:index,assets:[...brands,...manifest.assets],icons},null,2)+';\n');
console.log(JSON.stringify({ids:index.length,families:new Set(index.map(s=>s.family)).size,variantFrames:index.reduce((n,s)=>n+s.variants.length,0),stateFrames:index.reduce((n,s)=>n+s.variants.length*s.states.length,0),illustrations:manifest.assets.length,responsiveRasterFiles:manifest.assets.reduce((n,a)=>n+a.variants.length,0),brandSVGs:brands.length,iconSVGs:icons.length}));
