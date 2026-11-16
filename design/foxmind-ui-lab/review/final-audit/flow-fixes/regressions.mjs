import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {Browser, sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';

const html = pathToFileURL(path.resolve(process.argv[2] || 'design/foxmind-ui-lab/01-foxmind.html')).href;
const key = 'foxmind-ui-lab-v1';
const browser = await Browser.launch({extraArgs:['--disable-background-networking']});
const page = await browser.newPage({width:1440,height:900,reducedMotion:true});
const checks = [];
const check = (label, actual, expected = true) => {
 checks.push({label, pass:JSON.stringify(actual)===JSON.stringify(expected), actual, expected});
};
const text = selector => page.eval(s => document.querySelector(s)?.textContent.trim(),selector);
const action = (name, extra='') => click('[data-action="'+name+'"]'+extra);
const click = selector => page.eval(s => document.querySelector(s).click(),selector);
const navigate = async route => {
 await page.eval(hash => location.hash=hash,route);
 await sleep(100);
};
const fill = (selector,value) => page.eval(({selector,value})=>{
 const input=document.querySelector(selector);
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
},{selector,value});
const stored = () => page.eval(k=>JSON.parse(localStorage.getItem(k)),key);
const submit = selector => page.eval(s=>document.querySelector(s).requestSubmit(),selector);
const failNextWrite = () => page.eval(()=>{
 const set=Storage.prototype.setItem;
 Storage.prototype.setItem=function(){
  Storage.prototype.setItem=set;
  throw new DOMException('Synthetic write failure','QuotaExceededError');
 };
});

try{
 await page.send('Network.enable');
 await page.send('Network.setBlockedURLs',{urls:['http://*','https://*']});
 await page.goto(html+'#docente/aulas');
 await page.eval(k=>localStorage.removeItem(k),key);
 await page.goto(html+'?flow-fixes#docente/aulas');
 await action('new-class');
 await fill('[data-wizard="name"]','Aula sin inscripción');
 await fill('[data-wizard="subject"]','Prueba');
 await fill('[data-wizard="group"]','1.º C');
 await action('wizard-next');
 await failNextWrite();
 await action('wizard-save');
 check('La escritura fallida conserva el paso visible',await text('.class-step-heading span'),'Paso 2 de 4');
 check('La escritura fallida muestra error', (await text('#toast')).includes('No pudimos guardar'));
 await action('close');
 await navigate('#docente/avisos');
 await action('nt-toggle','[data-id="delivery-r1"]');
 const after = await stored();
 check('Otro guardado conserva cero borradores',after.drafts.length,0);
 check('Otro guardado tampoco serializa el asistente transitorio',after.wizard,null);

 const fixture = {
  id:'class-demo-audit',name:'Aula sin inscripción',subject:'Prueba',group:'1.º C',asset:'literature',
  topics:1,taught:0,roster:[],units:['Unidad'],unitTopics:[['Un tema para el aula']],
 };
 await page.eval(({key,fixture})=>{
  const state=JSON.parse(localStorage.getItem(key));
  state.classes.push(fixture);
  state.posts=[{...state.posts[0],classId:undefined},{name:'Marina',title:'Consulta antigua sin aula',body:'Sin origen',time:'Ahora',type:'Consulta'}];
  delete state.wallScoped;
  state.reviews.push({id:'undated',name:'Sofía',title:'Entrega sin fecha',classId:'bio',state:'pending'});
  localStorage.setItem(key,JSON.stringify(state));
 },{key,fixture});
 await page.goto(html+'?flow-fixes-migration#docente/aula/muro?class=photo');
 check('Se recupera el aviso de ejemplo en su aula', (await text('#main')).includes('Esta semana miramos distinto'));
 check('El post antiguo de origen incierto queda excluido', !(await text('#main')).includes('Consulta antigua sin aula'));
 await action('new-post');
 await fill('#post-form [name="title"]','Aviso exclusivo de fotografía');
 await fill('#post-body','Mensaje para el aula de Foto.');
 await submit('#post-form');
 check('Post guarda el aula de origen',(await stored()).posts[0].classId,'photo');
 await click('.sidebar-classes [data-class="bio"]');
 await sleep(100);
 await page.eval(()=>history.back());
 await sleep(100);
 check('Atrás restaura el aula exacta',await text('h1'),'Fotografía y luz');
 check('Atrás restaura el muro exacto',await page.eval(()=>location.hash),'#docente/aula/muro?class=photo');
 await navigate('#docente/aula/muro?class=bio');
 check('El muro de otra aula excluye ese post',!(await text('#main')).includes('Aviso exclusivo de fotografía'));

 await navigate('#docente/aula/plan?class=class-demo-audit');
 await action('invite');
 const code=await text('dialog .loading-card p');
 check('El aula expone un código de seis dígitos',/^[0-9]{6}$/.test(code)&&code!=='482619');
 await action('close');
 await navigate('#estudiante/aulas');
 check('Mis aulas omite el aula sin inscripción',!(await text('#class-results')).includes(fixture.name));
 await action('search');
 await fill('#global-search',fixture.name);
 check('Buscar omite el aula sin inscripción',!(await text('#global-results')).includes(fixture.name));
 await action('close');
 await navigate('#estudiante/aula/plan?class=class-demo-audit');
 check('Ruta del aula sin inscripción regresa a la colección',await page.eval(()=>location.hash),'#estudiante/aulas');
 await action('join');
 await fill('#f-code',code);
 await submit('#join-form');
 check('El código permite revisar el aula correcta antes de aceptar', (await text('dialog')).includes(fixture.name));
 check('Revisar invitación todavía mantiene roster vacío',(await stored()).classes.find(c=>c.id===fixture.id).roster,[]);
 await action('confirm-join');
 check('Aceptar agrega una sola inscripción de Marina',(await stored()).classes.find(c=>c.id===fixture.id).roster,['Marina']);
 await navigate('#estudiante/aula/muro?class=class-demo-audit');
 check('El aula queda accesible después de aceptar',await text('h1'),fixture.name);
 await action('new-post');
 await fill('#post-form [name="title"]','¿Qué vemos en esta clase?');
 await fill('#post-body','Consulta del aula recién aceptada.');
 await submit('#post-form');

 await navigate('#docente/inicio');
 await action('home-queries');
 const query = await page.eval(()=>[...document.querySelectorAll('[data-action="home-query"]')].find(b=>b.textContent.includes('¿Qué vemos en esta clase?'))?.dataset.id);
 check('Inicio deriva la consulta del muro',Boolean(query));
 await action('home-query','[data-id="'+query+'"]');
 await sleep(100);
 check('Inicio abre el muro de origen',await text('h1'),fixture.name);
 await action('reply','[data-id="'+query+'"]');
 await fill('#post-body','Lo conversamos en el próximo encuentro.');
 await submit('#post-form');
 check('Respuesta muestra su autora',await text('[data-post-id="'+query+'"] .notice'),'Lucía: Lo conversamos en el próximo encuentro.');
 await navigate('#docente/inicio');
 check('Una consulta respondida sale de pendientes',!(await text('.home-review-list')).includes('¿Qué vemos en esta clase?'));
 await navigate('#docente/avisos');
 check('Una entrega antigua sin fecha no rompe la bandeja',(await text('#main')).includes('Entrega sin fecha'));
 check('Sin errores JavaScript',page.consoleErrors,[]);
} finally {
 await browser.close();
 for(const c of checks)console.log(c.pass?'PASS':'FAIL',c.label,c.pass?'':JSON.stringify({actual:c.actual,expected:c.expected}));
}
assert.equal(checks.filter(c=>!c.pass).length,0);

