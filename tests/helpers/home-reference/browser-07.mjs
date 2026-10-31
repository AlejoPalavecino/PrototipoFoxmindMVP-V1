const task=await taskSpace(35),page=task.page('p2');
const fs=await import('node:fs/promises'),assert=(await import('node:assert/strict')).default;
const dir='C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference';
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await page.click('loc=role:button[name="Cargar más"]');
await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Todas: Tus aulas"]>ul>li').length===7);
const panel=await page.evaluate(()=>({rows:document.querySelectorAll('[aria-label="Todas: Tus aulas"]>ul>li').length,
  more:[...document.querySelectorAll('button')].some(button=>button.textContent==='Cargar más')}));
assert.equal(panel.rows,7);assert.equal(panel.more,false);
await page.click('loc=role:button[name="Volver a Inicio"]');
await page.waitForFunction(()=>document.activeElement?.getAttribute('data-home-expand')==='classrooms');
const returned=await page.evaluate(()=>({focus:document.activeElement.getAttribute('data-home-expand'),
  rows:document.querySelectorAll('.fm-home-module--classrooms>ul>li').length}));
assert.deepEqual(returned,{focus:'classrooms',rows:4});
await page.screenshot({path:`${dir}/final-panel-return.png`});
const groups=[];
for(const mode of ['mixed','teach','study','none','archived']){
  await page.goto(`http://127.0.0.1:53191/inicio?mode=${mode}&fixture=true`);await page.waitForSelector('.fm-home--reference');
  const present=await page.evaluate(()=>[...document.querySelectorAll('section[aria-label="Mi aprendizaje"],section[aria-label="Mi actividad docente"]')].map(node=>node.getAttribute('aria-label')));
  assert.deepEqual(present,mode==='mixed'?['Mi actividad docente']:mode==='teach'?['Mi actividad docente']:mode==='study'?['Mi aprendizaje']:[]);
  groups.push({mode,present});
}
await page.goto('http://127.0.0.1:53191/inicio?mode=loading&fixture=true');
await page.waitForSelector('[aria-busy="true"]');
const loading=await page.evaluate(()=>({busy:document.querySelector('[aria-busy="true"]').getAttribute('aria-busy'),
  text:document.querySelector('[role="status"]').textContent}));
await page.screenshot({path:`${dir}/final-loading.png`});
await fs.writeFile(`${dir}/panel-and-states.json`,JSON.stringify({panel,returned,groups,loading},null,2));
console.log({panel,returned,groups,loading});
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1784,height:882,deviceScaleFactor:1,mobile:false});
await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');
await page.waitForSelector('.fm-home--reference');
console.log(await page.snapshot());
