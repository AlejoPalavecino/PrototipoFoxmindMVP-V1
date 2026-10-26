const task=await taskSpace(3),page=task.page('p1');
const fs=await import('node:fs/promises'),assert=await import('node:assert/strict');
const dir='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-home-polish';
const existing=JSON.parse(await fs.readFile(dir+'/interaction-proof.json','utf8'));
for(const check of existing) assert.deepEqual(check.observed,check.expected,check.control);
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
await page.goto('http://127.0.0.1:53271/?mode=teach');
await page.waitForSelector('.fm-home-teacher-tools',{state:'visible'});
await fs.writeFile(dir+'/teacher-tools.snapshot.txt',await page.snapshot({scope:'full_page'}));
for(const [label,kind] of [['Crear actividad','create-activity'],['Subir material','upload-material'],['Publicar aviso','publish-notice']]) {
 await page.click('loc=role:button[name*="'+label+'"]',{label:'Comprobar herramienta docente'});
 const observed=JSON.parse(await page.evaluate(()=>document.querySelector('[data-qa-action]').textContent));
 const expected={kind,classroomId:'11111111-1111-4111-8111-111111111111'};
 assert.deepEqual(observed,expected);existing.push({control:label,observed,expected});
}
await page.goto('http://127.0.0.1:53271/?mode=study');
await page.waitForSelector('.fm-home-module--feedback',{state:'visible'});
await fs.writeFile(dir+'/feedback.snapshot.txt',await page.snapshot({scope:'full_page'}));
await page.click('loc=role:button[name="Ver devolución: Ecosistemas: devolución publicada"]',{label:'Comprobar devolución publicada'});
const grade=JSON.parse(await page.evaluate(()=>document.querySelector('[data-qa-action]').textContent));
assert.equal(grade.kind,'grade');existing.push({control:'published feedback',observed:grade.kind,expected:'grade'});
const readiness=await page.evaluate(()=>({title:document.querySelector('h1').textContent,fixture:true,authenticatedE2E:false,ready:!document.querySelector('[aria-busy="true"]'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,failedImages:[...document.images].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.getAttribute('src')),externalAPIRequests:performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes(':52170')||x.includes('/api/')),animations:document.querySelector('.fm-home-greeting')?getComputedStyle(document.querySelector('.fm-home-greeting')).animationDuration:null}));
assert.equal(readiness.ready,true);assert.deepEqual(readiness.failedImages,[]);assert.deepEqual(readiness.externalAPIRequests,[]);
await fs.writeFile(dir+'/interaction-proof.json',JSON.stringify(existing,null,2));
await fs.writeFile(dir+'/readiness-proof.json',JSON.stringify(readiness,null,2));
console.log({checks:existing.length,readiness});
console.log(await page.snapshot());
