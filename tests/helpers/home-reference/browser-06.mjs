const task=await taskSpace(35),page=task.page('p2');
const fs=await import('node:fs/promises'),assert=(await import('node:assert/strict')).default;
const dir='C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference';
const results=[];
async function settled(){
  await page.waitForSelector('.fm-home--reference');
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
  await page.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'||animation.effect.getComputedTiming().endTime===Infinity));
}
for(const width of [1784,1440,768,390,320]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:width===1784?882:900,deviceScaleFactor:1,mobile:false});
  await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');await settled();
  const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    hero:document.querySelector('.fm-home-greeting').getBoundingClientRect().height,
    agenda:document.querySelector('.fm-home-module--agenda').getBoundingClientRect().height,
    clipped:[...document.querySelectorAll('.fm-home button,.fm-home h1,.fm-home h2,.fm-home h3')]
      .filter(node=>node.getBoundingClientRect().width&&node.scrollWidth>node.clientWidth+2).map(node=>node.textContent.trim()),
    small:[...document.querySelectorAll('button,a,summary')].filter(node=>node.getBoundingClientRect().width&&getComputedStyle(node).visibility!=='hidden')
      .map(node=>({text:node.textContent.trim().slice(0,45),w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}))
      .filter(rect=>rect.w<44||rect.h<44)}));
  assert.ok(state.scroll<=state.width);assert.deepEqual(state.clipped,[]);assert.deepEqual(state.small,[]);
  results.push(state);await page.screenshot({path:`${dir}/final-mixed-${width}.png`});
}
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
for(const [label,action] of [['Mis aulas','classrooms'],['Crear aula','create'],['Mi Agenda','agenda'],['Unirme con código','join']]){
  await page.focus(`.fm-home-shortcuts button:has-text("${label}")`);await page.keyboard.press('Enter');
  await page.waitForFunction(value=>document.querySelector('[data-qa-action]').textContent===value,action);
  const focus=await page.evaluate(()=>({text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outlineStyle,
    width:getComputedStyle(document.activeElement).outlineWidth}));
  results.push({action,focus});assert.notEqual(focus.outline,'none');
}
await page.screenshot({path:`${dir}/final-keyboard-focus.png`});
for(const mode of ['teach','study','none','archived','unknown','long','error']){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width:mode==='long'?320:1440,height:900,deviceScaleFactor:1,mobile:false});
  await page.goto(`http://127.0.0.1:53191/inicio?mode=${mode}&fixture=true`);await settled();
  const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    summary:document.querySelector('[aria-label="Tu actividad"]').textContent,
    groups:[...document.querySelectorAll('.fm-home-work-groups>section')].map(node=>node.getAttribute('aria-label')),
    retries:[...document.querySelectorAll('.fm-home-module-error button')].map(node=>node.textContent),
    images:[...document.images].every(image=>image.complete&&image.naturalWidth>0)}));
  assert.ok(state.scroll<=state.width);assert.ok(state.images);assert.doesNotMatch(state.summary,/\d+\s*%/);
  if(mode==='unknown')assert.doesNotMatch(state.summary,/Actividades por entregar|Devoluciones disponibles|Entregas por revisar/);
  results.push({mode,...state});await page.screenshot({path:`${dir}/final-${mode}.png`});
}
for(const name of ['pending','feedback','review','materials']){
  const selector=`.fm-home-module--${name} .fm-home-module-error button`;
  await page.click(selector);await page.waitForSelector(selector,{state:'detached'});
}
results.push({recovered:await page.evaluate(()=>({retries:document.querySelectorAll('.fm-home-module-error button').length,requests:document.querySelector('[data-qa-reads]').textContent}))});
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');await settled();
results.push({reducedMotion:await page.evaluate(()=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,
  running:document.getAnimations().filter(animation=>animation.playState==='running').length}))});
await page.cdp('Emulation.setEmulatedMedia',{features:[]});
await fs.writeFile(`${dir}/final-observations.json`,JSON.stringify(results,null,2));console.log(results);
await page.goto('http://127.0.0.1:53191/inicio?mode=many&fixture=true');await settled();
await page.click('[data-home-expand="classrooms"]');
console.log(await page.snapshot());
