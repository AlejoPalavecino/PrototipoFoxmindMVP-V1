import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frames=JSON.parse(await fs.readFile(path.join(root,'review/screen-index.json'),'utf8'));
const phaseFor=id=>id.startsWith('CLASS-15')?'D4':({NAV:id==='NAV-02'?'D4':'D2',AUTH:'D2',ACC:'D2',HOME:'D9',CLASS:'D3',PLAN:'D4',LIB:'D4',WALL:'D4',PEOPLE:'D3',ACT:'D5',AI:'D5',SUB:'D6',GRADE:'D7',PROG:'D7',AGENDA:'D8'}[id.split('-')[0]]);
const assetFor=id=>({AUTH:'scenes/auth + scenes/security',ACC:'scenes/profile + scenes/security',HOME:'hero/welcome-learn + hero/welcome-teach',NAV:'brand/logo-horizontal + icons',CLASS:'covers/* + states/*',PLAN:'covers/* + icons',LIB:'icons/file + states/*',WALL:'icons/chat + states/*',PEOPLE:'icons/users + states/*',ACT:'icons/clipboard + states/*',AI:'icons/spark + states/*',SUB:'icons/clipboard + states/*',GRADE:'icons/check + states/*',PROG:'icons/progress + states/*',AGENDA:'scenes/agenda + icons/calendar'}[id.split('-')[0]]);
const rows=[];
for(const file of (await fs.readdir(path.join(root,'flows'))).filter(n=>n.endsWith('.md')).sort()){
 const text=await fs.readFile(path.join(root,'flows',file),'utf8');
 for(const m of text.matchAll(/^## ([A-Z]+-\d{2}) — (.+)$/gm)){
  const frame=frames.find(f=>f.id===m[1]);if(!frame)throw new Error(`Missing visual ${m[1]}`);
  rows.push({id:m[1],title:m[2].trim(),spec:frame.sourceDoc.replace('../',''),visual:`review/${frame.frame}`,phase:phaseFor(m[1]),assets:assetFor(m[1]),family:frame.family,variants:frame.variants,states:frame.states});
 }
}
if(rows.length!==82||new Set(rows.map(r=>r.id)).size!==82)throw new Error(`Expected 82 unique IDs, got ${rows.length}`);
const routes=[
 ['/', 'apps/web/pages/index.tsx','AUTH-01'],['/sign-in','apps/web/pages/sign-in.tsx','AUTH-01'],
 ['/register','apps/web/pages/register.tsx','AUTH-02'],['/verify-email','apps/web/pages/verify-email.tsx','AUTH-03'],
 ['/forgot-password','apps/web/pages/forgot-password.tsx','AUTH-04'],['/recover-password','apps/web/pages/recover-password.tsx','AUTH-05'],
 ['/inicio','apps/web/pages/inicio.tsx','HOME-01, HOME-02, NAV-02'],['/mis-aulas','apps/web/pages/mis-aulas.tsx','CLASS, PLAN, LIB, WALL, PEOPLE, ACT, AI, SUB, GRADE, PROG'],
 ['/agenda','apps/web/pages/agenda.tsx','AGENDA-01..10'],['/profile','apps/web/pages/profile.tsx','ACC-01, ACC-02'],
 ['/files','apps/web/pages/files.tsx','LIB-05']
].map(([route,source,ids])=>({route,source,ids}));
await fs.writeFile(path.join(root,'coverage.json'),JSON.stringify({baseline:'e7f5d6f67520516fe56fe9794ab8d1ac97633bdd',date:'2026-10-25',totalFlows:82,existingPages:routes,newRoute:{route:'/settings',ids:'ACC-02',status:'proposed'},flows:rows},null,2)+'\n');
let md='# Cobertura funcional y visual\n\n**82 flujos documentados y enlazados a vistas del atlas; 11 páginas públicas de UI existentes inventariadas.** No son 82 nuevas rutas ni 82 pruebas funcionales ejecutadas. Cada ID incluye estados, permisos, acciones y aceptación futura en su contrato. Las composiciones visuales comparten familias y controles; las variantes genéricas de carga/error complementan los casos específicos descritos.\n\nBase: `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`. [Plan por etapas](implementation-plan.md) · [Atlas](review/screens.html) · [JSON](coverage.json).\n\n## Rutas reales y cambio propuesto\n\n| Ruta actual | Archivo existente | Flujos |\n|---|---|---|\n';
for(const r of routes)md+=`| \`${r.route}\` | \`${r.source}\` | ${r.ids} |\n`;
md+='\n`_app.tsx` y `_document.tsx` son infraestructura, no pantallas separadas. Las rutas API son operaciones cubiertas por los contratos funcionales, no páginas de UI. `/settings` es la única ruta nueva propuesta; hoy contraseña/logout viven en cuenta. Las pestañas y diálogos de aula permanecen dentro de `/mis-aulas` con destinos profundos autorizados.\n\n## Matriz completa\n\n| ID | Recorrido y contrato | Vista | Etapa | Recursos |\n|---|---|---|---|---|\n';
for(const r of rows)md+=`| ${r.id} | [${r.title}](${r.spec}) | [Abrir](${r.visual}) | ${r.phase} | ${r.assets} |\n`;
md+='\n## Cruces y límites\n\nCLASS y PEOPLE se solapan deliberadamente: el primero define alta/membresía y el segundo su contexto en aula; no duplicar endpoints ni estados. LIB-05 conserva archivos privados; NAV-02 y GRADE-05 cubren el mismo sistema de notificaciones en distintos destinos. La API de Home agregada, la nueva ruta settings, los destinos directos de atajos y la ampliación opcional de portadas requieren las tareas explícitas del plan.\n\nUna vista del atlas no ejecuta solicitudes de cuenta, carga, publicación, pago ni envío. La revisión visual observada está en [el informe](checks/README.md); las pruebas de producto se ejecutarán al implementar. Ninguna imagen de referencia agrega una función ausente en los contratos.\n';
await fs.writeFile(path.join(root,'coverage.md'),md);
console.log(JSON.stringify({flows:rows.length,pages:routes.length,phases:[...new Set(rows.map(r=>r.phase))]}));
