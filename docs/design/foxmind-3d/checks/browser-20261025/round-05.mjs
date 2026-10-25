const task=await taskSpace(7);const page=task.page('p1');
await page.reload();
const results=[];
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 results.push(...await page.evaluate(async()=>{
  const result=[];
  for(const s of window.FOX_REVIEW.screens){
   location.hash=s.id+'/'+s.variants[0]+'/normal';
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
   result.push({id:s.id,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),heading:document.querySelector('#canvas h1')?.textContent||null});
  }return result;
 }));
}
const fs=await import('node:fs/promises');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/checks/browser-20261025/';
const report={date:'2026-10-25',revision:'canonical tokens final CSS',spaceId:7,mode:'local static design atlas',renders:results.length,overflow:results.filter(r=>r.scrollWidth>r.width),broken:results.filter(r=>r.broken.length),missingHeading:results.filter(r=>!r.heading),results};
await fs.writeFile(base+'browser-results.json',JSON.stringify(report,null,2)+'\n');
console.log({renders:report.renders,overflow:report.overflow,broken:report.broken,missingHeading:report.missingHeading});
await page.evaluate(()=>{location.hash='HOME-01/mixed/normal'});
await page.click('loc=css:#toggle-review');
for(const[name,hash,width]of [['home-final','HOME-01/mixed/normal',1440],['auth-final','AUTH-02/default/normal',390],['home-mobile-final','HOME-01/study/normal',390],['authoring-final','ACT-04/quiz/normal',1440],['classrooms-final','CLASS-01/default/normal',1440]]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await page.evaluate(async h=>{location.hash=h;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0)},hash);
 await page.screenshot({path:base+name+'.png'});
}
await page.goto('file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/review/index.html');
console.log(await page.snapshot());
