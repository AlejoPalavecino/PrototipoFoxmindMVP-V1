
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../../activity-authoring.js',import.meta.url),'utf8');
const saved = {value:null};
const classroom = {id:'photo',name:'Fotografía y luz'};
const state = {classes:[classroom],classArchived:[],activities:[],activityDrafts:[],selectedClass:'photo',author:null};
const actions = {'leave-focus':()=>{},'demo-error':()=>{},'ai-tool':()=>{}};
const nodes = new Map();
let html = '', dialog = null, loadingCallback = null, jobs = 0, focused = '';
function select(selector) {
 if (selector === '#dialog') return {open:!!dialog};
 if (selector.startsWith('#') && !html.includes('id="'+selector.slice(1)+'"')) return null;
 if (selector.startsWith('.')) return null;
 if (!nodes.has(selector)) nodes.set(selector,{dataset:{},textContent:'',hidden:false,
  setAttribute(){},removeAttribute(){},classList:{toggle(){}},scrollIntoView(){},focus(){focused=selector}});
 return nodes.get(selector);
}
const context = {
 assert,state,actions,structuredClone,crypto:webcrypto,role:'docente',view:'aula',$:select,$$:()=>[],
 classroom:()=>classroom,curriculumUnits:()=>[{id:'u1',title:'Luz',topics:[{id:'t1',title:'Contraste'},{id:'t2',title:'Sombras'}]}],
 save(){saved.value=JSON.stringify(state);return true;},toast(){},
 go(target){context.view=target;context.render();},
 render(){html=context.view === 'crear' ? context.authorScreen() : '';nodes.clear();},
 esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 icon:name=>'['+name+']',status:name=>name,focusShell:(body,title,subtitle,footer)=>body+footer,
 btn:(label,action,kind,icon,attrs)=>'<button data-action="'+action+'" '+(attrs||'')+'>'+label+'</button>',
 loading(title,messages,fn){jobs++;loadingCallback=fn;dialog={title};},closeDialog(){dialog=null;loadingCallback=null;},
 showDialog(title,description,body,footer){dialog={title,body,footer};},confirmAction(title,copy,action){dialog={title,action};},
 document:{addEventListener(){}},window:{addEventListener(){},scrollTo(){},scrollY:0},
 getHtml:()=>html,getFocus:()=>focused,getJobs:()=>jobs,getDialog:()=>dialog,
 complete(){assert.ok(loadingCallback);loadingCallback();},reload(){Object.assign(state,JSON.parse(saved.value));}
};
runInNewContext(source+'\n'+[
 'installAuthoringExperience();',
 'const act=(action,dataset={},id="")=>actions[action]({dataset,id});',
 'const input=(key,value,checked=true)=>composeInput({target:{dataset:{compose:key},value,checked}});',
 'startActivityAuthor();input("topic","t1");input("type","Trabajo práctico");input("method","ai");',
 'act("compose-next");assert.equal(getJobs(),0,"Elegir IA sin escribir la idea debe bloquear la generación");',

 'assert.equal(state.author.step,0);assert.equal(getFocus(),"#compose-ai-brief");',
 'assert.ok($("#compose-ai-brief-error").textContent.includes("Escribí una idea"));',
 'input("aiBrief","  \\n\\t");act("compose-next");assert.equal(getJobs(),0,"Espacios solos bloquean IA");',
 'input("aiBrief","x".repeat(1201));act("compose-next");assert.equal(getJobs(),0,"Respeta el límite también en la acción");',
 'assert.ok($("#compose-ai-brief-error").textContent.includes("1200"));',
 'const brief="Que comparen dos fotos en un video. Nota privada: Piña-AX9.";input("aiBrief",brief);',
 'act("compose-brief-example",{id:"compare"});assert.equal(state.author.aiBrief,brief);assert.equal(getJobs(),0);',
 'assert.ok($("#compose-ai-brief-example").textContent.includes("semejanza"));',
 'assert.equal($("#compose-ai-brief-count").textContent,brief.length+"/1200");',
 'input("method","manual");assert.equal($("#compose-ai-brief-panel").hidden,true);',
 'input("type","Evaluación");input("topic","t2");input("type","Trabajo práctico");input("method","ai");',
 'assert.equal($("#compose-ai-brief-panel").hidden,false);assert.equal(state.author.aiBrief,brief);',
 'act("compose-save");const draftId=state.author.id;assert.equal(state.activityDrafts[0].aiBrief,brief);',
 'reload();state.author=null;resumeActivityDraft(draftId);assert.equal(state.author.aiBrief,brief);',
 'act("demo-error");complete();assert.equal(getJobs(),1);assert.match(getDialog().title,/No se pudo/);',
 'assert.equal(state.author.aiBrief,brief);assert.equal(state.author.spec.title,"");',
 'act("compose-generate");complete();assert.equal(getJobs(),2);assert.equal(state.author.step,1);',
 'assert.match(state.author.spec.objective,/Comparar ejemplos/);assert.match(state.author.spec.instructions,/entregá un video/);',
 'assert.equal(state.author.spec.rubric[1].title,"Comparación de ejemplos");assert.doesNotMatch(JSON.stringify(state.author.spec),/Piña-AX9/);',
 'const previous=state.author.generatedFor;act("compose-edit-idea");assert.equal(getFocus(),"#compose-ai-brief");',
 'const revision="Que creen una infografía. Comentario interno: Kiwi-X98.";input("aiBrief",revision);',
 'act("compose-next");assert.equal(getJobs(),2,"Cambiar la idea conserva la propuesta hasta pedir regeneración");',
 'assert.match(getHtml(),/Cambió el alcance, el tipo o tu idea/);assert.notEqual(composeSignature(state.author),previous);',
 'act("compose-regenerate");assert.equal(getDialog().action,"compose-generate");act("compose-generate");complete();',
 'assert.equal(getJobs(),3);assert.equal(state.author.aiBrief,revision);assert.match(state.author.spec.instructions,/entregá una infografía/);',
 'assert.doesNotMatch(getHtml(),/Kiwi-X98/);',
 'act("compose-edit-idea");input("aiBrief","");state.author.step=1;render();act("compose-regenerate");',
 'assert.equal(getJobs(),3);assert.equal(state.author.step,0);assert.equal(getFocus(),"#compose-ai-brief");',
 'act("compose-generate");assert.equal(getJobs(),3,"La acción usada por reintentar también se valida");',
 'input("aiBrief",revision);act("compose-next");input("date","2026-12-20");input("time","17:00");act("compose-next");',
 'assert.equal(state.author.step,2);act("compose-publish");assert.equal(state.activities.length,0);',
 'act("compose-confirm-publish");assert.equal(state.activities.length,1);assert.equal(state.activityDrafts.length,0);',
 'assert.doesNotMatch(JSON.stringify(state.activities[0]),/aiBrief|generatedFor|Kiwi-X98|Piña-AX9/);',
 'assert.match(state.activities[0].spec.instructions,/entregá una infografía/);',
 'startActivityAuthor();input("topic","t1");input("type","Trabajo práctico");input("method","manual");',
 'assert.equal($("#compose-ai-brief-panel").hidden,true);act("compose-next");assert.equal(state.author.step,1);assert.equal(getJobs(),3);'

].join('\n'),context);
console.log('Autoría: idea obligatoria, manual libre, ejemplos, cambios de alcance, borrador, reintento, propuesta vigente y publicación privada.');

