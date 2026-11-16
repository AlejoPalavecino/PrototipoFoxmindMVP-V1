import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';

const app = process.argv[2] ? pathToFileURL(process.argv[2]) : new URL('../../01-foxmind.html',import.meta.url);
app.hash = 'estudiante/carpetas';
const browser = await Browser.launch();
const click = (page,selector)=>page.eval(q=>{
 const element=document.querySelector(q);
 if (!element) throw Error('Falta '+q);
 element.click();
},selector);
const action = (page,name)=>click(page,`[data-action="${name}"]`);
const snapshot = page=>page.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
async function waitFor(page,selector) {
 for(let i=0;i<50;i++){
  if (await page.eval(q=>!!document.querySelector(q),selector)) return;
  await sleep(80);
 }
 assert.fail('No apareció '+selector);
}

async function createPractice(page,kind) {
 if (!(await page.eval(()=>!!document.querySelector('[data-action="fx-tool"][data-kind="practice"]')))) {
  await click(page,'[data-action="fx-pane"][data-value="tools"]');
 }
 await click(page,`[data-action="fx-tool"][data-kind="${kind}"]`);
 await action(page,'fx-tool-example');
 await click(page,'[name="fx-tool-topic"]');
 await click(page,'[form="fx-tool-form"]');
 await waitFor(page,'[data-action="fx-practice"]');
 await action(page,'fx-practice');
 await waitFor(page,'.fp-question');
}

try {
 const page = await browser.newPage({width:390,height:844,reducedMotion:true});
 await page.goto(app.href,{timeoutMs:3000,settleMs:150});
 await click(page,'[data-folder="0"]');
 await waitFor(page,'.foxy-space');
 await createPractice(page,'practice');
 const photo = (await snapshot(page)).fxPractice.creationId;
 assert.match(await page.eval(()=>document.querySelector('.fp-question legend').textContent), /tiempo de exposición/);
 assert.equal(await page.eval(()=>document.querySelector('.fp-results')!==null), false);
 await click(page,'[data-action="fp-jump"][data-id="2"]');
 await action(page,'fp-review');
 assert.equal(await page.eval(()=>document.querySelector('[data-action="fp-finish"]').disabled),true);
 await click(page,'[data-action="fp-jump"][data-id="0"]');
 await page.eval(()=>{
  window.practiceSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=()=>{throw Error('Guardado bloqueado para la prueba');};
 });
 await click(page,'[name="fp-answer"][value="0"]');
 assert.equal(await page.eval(()=>document.querySelector('[name="fp-answer"]:checked')===null),true);
 assert.equal(await page.eval(()=>document.querySelector('#fp-save-status').dataset.tone),'error');
 await page.eval(()=>{Storage.prototype.setItem=window.practiceSetItem;});
 await click(page,'[name="fp-answer"][value="0"]');
 await action(page,'fp-next');
 await click(page,'[name="fp-answer"][value="0"]');
 await action(page,'fp-exit');
 await waitFor(page,'.foxy-space');
 await click(page,'[data-action="fx-pane"][data-value="creations"]');
 await click(page,`[data-action="fx-creation"][data-id="${photo}"]`);
 await action(page,'fx-practice');
 await waitFor(page,'.fp-question');
 assert.equal(await page.eval(()=>document.querySelector('.question-position').textContent),'Pregunta 2 de 3');
 assert.equal(await page.eval(()=>document.querySelector('[name="fp-answer"]:checked').value),'0');
 await action(page,'fp-next');
 await click(page,'[name="fp-answer"][value="2"]');
 await action(page,'fp-review');
 assert.equal(await page.eval(()=>document.querySelector('.fp-review').textContent.includes('Respuesta esperada')),false);
 await action(page,'fp-finish');
 assert.equal(await page.eval(()=>document.activeElement.textContent),'Seguir revisando');
 await click(page,'.dialog-footer [data-action="close"]');
 assert.equal(await page.eval(()=>document.querySelector('.fp-results')!==null),false);
 await action(page,'fp-finish');
 await action(page,'fp-confirm');
 assert.equal(await page.eval(()=>document.querySelectorAll('.fp-results .success').length),2);
 assert.equal(await page.eval(()=>document.querySelectorAll('.fp-results .error').length),1);
 assert.equal(await page.eval(()=>document.querySelector('.focus-footer').getBoundingClientRect().bottom<=innerHeight),true);
 await action(page,'fp-retry');
 const attempts=(await snapshot(page)).fxPracticeAttempts[photo];
 assert.deepEqual(attempts.map(a=>a.answers),[[0,0,2],[null,null,null]]);
 assert.equal(attempts[0].stage,'complete');
 for(const answer of [0,1,2]){
  await click(page,`[name="fp-answer"][value="${answer}"]`);
  await action(page,answer===2?'fp-review':'fp-next');
 }
 await action(page,'fp-finish');
 await action(page,'fp-confirm');
 assert.deepEqual(await page.eval(()=>[...document.querySelectorAll('.fp-attempts button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-pressed')])),[['Intento 1','false'],['Intento 2','true']]);
 await click(page,'.fp-attempts button:first-child');
 assert.equal(await page.eval(()=>document.activeElement.textContent.trim()),'Intento 1');
 assert.equal(await page.eval(()=>document.querySelectorAll('.fp-results .error').length),1);
 await click(page,'.fp-attempts button:last-child');
 assert.equal(await page.eval(()=>document.querySelectorAll('.fp-results .success').length),3);
 await action(page,'fp-exit');
 await waitFor(page,'.foxy-space');
 await page.eval(()=>location.hash='#estudiante/carpetas');
 await waitFor(page,'[data-folder="1"]');
 await click(page,'[data-folder="1"]');
 await waitFor(page,'.foxy-space');
 await createPractice(page,'exam');
 await page.setViewport({width:320,height:640});
 const biology=await snapshot(page);
 assert.notEqual(biology.fxPractice.creationId,photo);
 assert.match(await page.eval(()=>document.querySelector('.fp-question legend').textContent), /estructura regula el intercambio/);
 assert.deepEqual(biology.fxPracticeAttempts[biology.fxPractice.creationId][0].answers,[null,null,null]);
 assert.deepEqual(biology.fxPracticeAttempts[photo][0].answers,[0,0,2]);
 assert.equal(await page.eval(()=>{
  const footer=document.querySelector('.focus-footer').getBoundingClientRect();
  return document.documentElement.scrollWidth<=innerWidth && footer.bottom<=innerHeight && footer.right<=innerWidth;
 }),true);
 console.log('Práctica y simulacro independientes verificados: reanudar, rollback, revisar sin revelar orientación, confirmar, resultado, reintento, aislamiento y footer a 320px.');
} finally {
 await browser.close();
}
