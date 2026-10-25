const task=await taskSpace(7);const page=task.page('p1');
await page.click('loc=css:#toggle-review');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/checks/browser-20261025/';
const captures=[['home-desktop-final','HOME-01/mixed/normal',1440],['classrooms-desktop','CLASS-01/default/normal',1440],['plan-desktop','PLAN-01/student/normal',1440],['authoring-desktop','ACT-04/quiz/normal',1440],['agenda-desktop','AGENDA-01/default/normal',1440],['home-mobile','HOME-01/study/normal',390],['auth-mobile','AUTH-02/default/normal',390],['submission-mobile','SUB-03/exam/normal',390],['agenda-mobile','AGENDA-04/default/normal',320]];
for(const[name,hash,width]of captures){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await page.evaluate(async hash=>{location.hash=hash;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0)},hash);
 await page.screenshot({path:base+name+'.png'});
}
console.log({captures:captures.map(c=>c[0])});
console.log(await page.snapshot());
