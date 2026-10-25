const task=await taskSpace(7);const page=task.page('p1');
const fs=await import('node:fs/promises');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const frames=JSON.parse(await fs.readFile(base+'review/screen-index.json','utf8'));
await fs.copyFile(base+'checks/browser-20261025/browser-results.json',base+'checks/browser-20261025/browser-results-before-wall-fix.json');
await page.goto('file:///'+base+'review/screens.html#HOME-01/study/normal');await page.reload();
const results=[];
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 for(const s of frames){
  await page.goto('file:///'+base+'review/screens.html#'+s.id+'/'+s.variants[0]+'/normal');
  await page.waitForFunction(id=>document.title.startsWith(id+' ·'),s.id,{timeout:5000});
  results.push({id:s.id,...await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,renderedId:document.title.split(' ·')[0],broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),heading:document.querySelector('#canvas h1')?.textContent||null}})});
 }
 console.log({width,renders:82});
}
const report={date:'2026-10-25',revision:'final wall wrapping and full-art responsive cards',spaceId:7,mode:'local static design atlas',renders:results.length,wrongFrame:results.filter(r=>r.id!==r.renderedId),overflow:results.filter(r=>r.scrollWidth>r.width),broken:results.filter(r=>r.broken.length),missingHeading:results.filter(r=>!r.heading),results};
await fs.writeFile(base+'checks/browser-20261025/browser-results.json',JSON.stringify(report,null,2)+'\n');
console.log({renders:report.renders,wrongFrame:report.wrongFrame,overflow:report.overflow,broken:report.broken,missingHeading:report.missingHeading});
for(const[name,hash,width]of [['home-final','HOME-01/mixed/normal',1440],['home-mobile-final','HOME-01/study/normal',390],['classrooms-final','CLASS-01/default/normal',1440],['classrooms-mobile-final','CLASS-01/default/normal',390],['wall-mobile-final','WALL-01/teacher/normal',320]]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await page.goto('file:///'+base+'review/screens.html#'+hash);
 await page.waitForFunction(id=>document.title.startsWith(id+' ·'),hash.split('/')[0],{timeout:5000});
 if(await page.evaluate(()=>document.querySelector('#toggle-review').getAttribute('aria-expanded')==='true'))await page.click('loc=css:#toggle-review');
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0)});
 await page.screenshot({path:base+'checks/browser-20261025/'+name+'.png'});
}
await page.goto('file:///'+base+'review/index.html');
console.log(await page.snapshot());
