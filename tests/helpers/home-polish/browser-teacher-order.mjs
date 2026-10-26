const task=await taskSpace('qa-home-polish-teach-order'),page=task.page('p1');
const fs=await import('node:fs/promises'),assert=await import('node:assert/strict');
const dir='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-home-polish';
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await page.goto('http://127.0.0.1:53271/?mode=teach');
await page.waitForSelector('.fm-home-teacher-tools',{state:'visible'});
await page.evaluate(()=>document.fonts.ready.then(()=>true));
await page.screenshot({path:dir+'/final-teach-order-1536.png'});
const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,toolsY:document.querySelector('.fm-home-teacher-tools').getBoundingClientRect().y,materialsY:document.querySelector('.fm-home-module--materials').getBoundingClientRect().y,heroY:document.querySelector('.fm-home-greeting').getBoundingClientRect().y,agendaY:document.querySelector('.fm-home-module--agenda').getBoundingClientRect().y}));
const proof=[];
for(const [label,kind] of [['Crear actividad','create-activity'],['Subir material','upload-material'],['Publicar aviso','publish-notice']]) {
 await page.click('loc=role:button[name*="'+label+'"]',{label:'Verificar herramienta docente final'});
 const observed=JSON.parse(await page.evaluate(()=>document.querySelector('[data-qa-action]').textContent));
 const expected={kind,classroomId:'11111111-1111-4111-8111-111111111111'};
 assert.deepEqual(observed,expected);proof.push({control:label,observed,expected});
}
assert.ok(metrics.toolsY<metrics.materialsY);assert.equal(metrics.overflow,0);
await fs.writeFile(dir+'/teacher-order-proof.json',JSON.stringify({spaceId:task.spaceId,metrics,proof},null,2));
await fs.writeFile(dir+'/final-teach-order.snapshot.txt',await page.snapshot({scope:'full_page'}));
console.log({spaceId:task.spaceId,metrics,checks:proof.length});
console.log(await page.snapshot());
